"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useRef, useState } from "react";
import { CANTIDAD_MAXIMA } from "@/lib/config/inventario";
import type { RegistroTurno } from "@/lib/datos/tipos";
import { formatearPesos } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import { MENSAJES } from "@/lib/reglas/errores";
import {
  estadoConteo,
  faltante,
  inventarioFinalCalculado,
  sobrante,
  totalVenta,
  valorACancelar,
} from "@/lib/reglas/registro";

type NombreCampo = "inicial" | "entrada" | "vendida" | "contado";
type Borrador = Record<NombreCampo, string>;
type Estado = { tipo: "inactivo" } | { tipo: "guardando" } | { tipo: "guardado" } | { tipo: "error"; mensaje: string };

function aBorrador(r: RegistroTurno): Borrador {
  return {
    inicial: String(r.inicial),
    entrada: String(r.entrada),
    vendida: String(r.vendida),
    contado: r.contado === null ? "" : String(r.contado),
  };
}

/** Número entero válido (0 a 9999), null si está vacío, NaN si es inválido. */
function leer(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isInteger(n) && n >= 0 && n <= CANTIDAD_MAXIMA ? n : Number.NaN;
}

const ETIQUETA: Record<NombreCampo, string> = {
  inicial: "Inicial",
  entrada: "Entrada",
  vendida: "Vendida",
  contado: "Contado",
};

function Celda({
  nombre,
  valor,
  soloLectura,
  ayuda,
  invalido,
  alCambiar,
  alSalir,
}: {
  nombre: NombreCampo;
  valor: string;
  soloLectura: boolean;
  ayuda?: string;
  invalido: boolean;
  alCambiar: (v: string) => void;
  alSalir: () => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-texto-suave">
        {ETIQUETA[nombre]}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={valor}
        readOnly={soloLectura}
        aria-readonly={soloLectura || undefined}
        aria-invalid={invalido || undefined}
        title={ayuda}
        placeholder={nombre === "contado" ? "—" : undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => alCambiar(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={alSalir}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`min-h-12 w-full rounded-lg border px-2 text-center text-lg font-semibold tabular-nums
          focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primario
          ${soloLectura ? "border-transparent bg-fondo text-texto-suave" : "bg-superficie text-texto"}
          ${invalido ? "border-alerta-roja" : soloLectura ? "" : "border-borde"}`}
      />
    </div>
  );
}

function Calculado({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-texto-suave">{etiqueta}</span>
      <output
        className={`flex min-h-12 items-center justify-center rounded-lg px-2 text-lg font-semibold tabular-nums
          ${destacado ? "bg-primario-suave text-primario-oscuro" : "bg-fondo text-texto"}`}
      >
        {valor}
      </output>
    </div>
  );
}

/**
 * Una fila de la planilla (sección 12). Los cálculos se ven al instante al escribir; cada campo se guarda
 * al salir de él (o con Enter). El inicial solo lo edita el administrador (RN-09).
 */
export function FilaRegistro({
  turnoId,
  registro,
  editable,
  puedeEditarInicial,
  alActualizar,
}: {
  turnoId: string;
  registro: RegistroTurno;
  editable: boolean;
  puedeEditarInicial: boolean;
  alActualizar: (r: RegistroTurno) => void;
}) {
  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(registro));
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });
  // Lo guardado: en estado para el render y en ref para los guardados en cola (que leen el valor más reciente).
  const [guardadoActual, setGuardadoActual] = useState(registro);
  const servidor = useRef(registro);
  const actual = useRef(borrador);
  const cola = useRef<Promise<void>>(Promise.resolve());

  function cambiar(campo: NombreCampo, valor: string) {
    const nuevo = { ...actual.current, [campo]: valor };
    actual.current = nuevo;
    setBorrador(nuevo);
    if (estado.tipo === "error") setEstado({ tipo: "inactivo" });
  }

  // Valores en vivo: lo escrito si es válido; si no, lo guardado.
  const vivo = (campo: Exclude<NombreCampo, "contado">) => {
    const n = leer(borrador[campo]);
    return n === null || Number.isNaN(n) ? guardadoActual[campo] : n;
  };
  const leidoContado = leer(borrador.contado);
  const contado = leidoContado === null || Number.isNaN(leidoContado) ? guardadoActual.contado : leidoContado;
  const inicial = vivo("inicial");
  const entrada = vivo("entrada");
  const vendida = vivo("vendida");
  const calculado = inventarioFinalCalculado(inicial, entrada, vendida);
  const total = totalVenta(vendida, registro.valorUnitario);
  const resultado = estadoConteo(calculado, contado);
  const unidadesFaltantes = faltante(calculado, contado);
  const unidadesSobrantes = sobrante(calculado, contado);
  const excede = vendida > inicial + entrada;

  async function guardar(): Promise<void> {
    const b = actual.current;
    const s = servidor.current;
    const cambios: Partial<Record<NombreCampo, number>> = {};
    const campos: NombreCampo[] = puedeEditarInicial
      ? ["inicial", "entrada", "vendida", "contado"]
      : ["entrada", "vendida", "contado"];

    for (const campo of campos) {
      const n = leer(b[campo]);
      if (n === null) continue; // vacío: no se envía (el conteo no se borra)
      if (Number.isNaN(n)) {
        setEstado({ tipo: "error", mensaje: `${ETIQUETA[campo]}: use un número entero entre 0 y ${CANTIDAD_MAXIMA}.` });
        return;
      }
      if (n !== s[campo]) cambios[campo] = n;
    }
    if (Object.keys(cambios).length === 0) {
      // Restaura lo que quedó vacío (por ejemplo, borrar el inicial sin escribir otro).
      const restaurado = aBorrador(s);
      actual.current = restaurado;
      setBorrador(restaurado);
      return;
    }
    const i = cambios.inicial ?? s.inicial;
    const e = cambios.entrada ?? s.entrada;
    const v = cambios.vendida ?? s.vendida;
    if (v > i + e) {
      setEstado({ tipo: "error", mensaje: MENSAJES.VENDIDO_EXCEDE_EXISTENCIA });
      return;
    }

    setEstado({ tipo: "guardando" });
    try {
      const guardado = await llamarApi<RegistroTurno>(`/turnos/${turnoId}/registros/${registro.id}`, {
        metodo: "PATCH",
        cuerpo: cambios,
      });
      servidor.current = guardado;
      setGuardadoActual(guardado);
      // Solo se reemplazan los campos enviados: lo que el usuario siga escribiendo no se pierde.
      const desdeServidor = aBorrador(guardado);
      const mezclado = { ...actual.current };
      for (const campo of Object.keys(cambios) as NombreCampo[]) mezclado[campo] = desdeServidor[campo];
      actual.current = mezclado;
      setBorrador(mezclado);
      setEstado({ tipo: "guardado" });
      alActualizar(guardado);
    } catch (err) {
      setEstado({ tipo: "error", mensaje: mensajeDeError(err) });
    }
  }

  function alSalir() {
    // Los guardados de una fila van en orden, aunque se salga rápido de varios campos.
    cola.current = cola.current.then(guardar);
  }

  // El fondo sale de las variables del tema (claro u oscuro) y cambia con una transición de CSS.
  const fondo =
    resultado === "faltante"
      ? "border-alerta-roja/40 bg-[color-mix(in_srgb,var(--color-alerta-roja)_7%,var(--color-superficie))]"
      : resultado === "sobrante"
        ? "border-borde bg-[color-mix(in_srgb,var(--color-sobrante)_7%,var(--color-superficie))]"
        : "border-borde bg-superficie";

  return (
    <motion.li
      layout="position"
      className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors duration-300 motion-reduce:transition-none sm:p-4 ${fondo}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold text-texto">{registro.nombre}</h3>
        <p className="text-sm text-texto-suave">
          Valor <span className="tabular-nums">{formatearPesos(registro.valorUnitario)}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Celda
          nombre="inicial"
          valor={borrador.inicial}
          soloLectura={!editable || !puedeEditarInicial}
          {...(puedeEditarInicial ? {} : { ayuda: "Solo el administrador ajusta el inicial." })}
          invalido={Number.isNaN(leer(borrador.inicial) ?? 0)}
          alCambiar={(v) => cambiar("inicial", v)}
          alSalir={alSalir}
        />
        <Celda
          nombre="entrada"
          valor={borrador.entrada}
          soloLectura={!editable}
          invalido={Number.isNaN(leer(borrador.entrada) ?? 0)}
          alCambiar={(v) => cambiar("entrada", v)}
          alSalir={alSalir}
        />
        <Celda
          nombre="vendida"
          valor={borrador.vendida}
          soloLectura={!editable}
          invalido={excede || Number.isNaN(leer(borrador.vendida) ?? 0)}
          alCambiar={(v) => cambiar("vendida", v)}
          alSalir={alSalir}
        />
        <Calculado etiqueta="Inv. final" valor={String(calculado)} destacado />
        <Calculado etiqueta="Total venta" valor={formatearPesos(total)} />
        <Celda
          nombre="contado"
          valor={borrador.contado}
          soloLectura={!editable}
          invalido={Number.isNaN(leer(borrador.contado) ?? 0)}
          alCambiar={(v) => cambiar("contado", v)}
          alSalir={alSalir}
        />
        <div className="col-span-3 flex flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-texto-suave">Conteo</span>
          <span
            className={`flex min-h-12 items-center justify-center rounded-lg px-2 text-sm font-semibold
              ${resultado === "faltante" ? "bg-alerta-roja/10 text-alerta-roja-texto" : ""}
              ${resultado === "sobrante" ? "bg-sobrante/10 text-sobrante" : ""}
              ${resultado === "cuadra" ? "bg-ok/10 text-ok-texto" : ""}
              ${resultado === "sin_conteo" ? "bg-fondo text-texto-suave" : ""}`}
          >
            {resultado === "faltante" && `Faltan ${unidadesFaltantes}`}
            {resultado === "sobrante" && `Sobran ${unidadesSobrantes}`}
            {resultado === "cuadra" && "Cuadra"}
            {resultado === "sin_conteo" && "Sin conteo"}
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {resultado === "faltante" ? (
          <motion.p
            key="faltante"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-sm font-medium text-alerta-roja-texto"
          >
            Faltan {unidadesFaltantes} unidades de {registro.nombre}: valor a cancelar{" "}
            <span className="tabular-nums">{formatearPesos(valorACancelar(unidadesFaltantes, registro.valorUnitario))}</span>.
          </motion.p>
        ) : null}
        {resultado === "sobrante" ? (
          <motion.p
            key="sobrante"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-sm font-medium text-sobrante"
          >
            Sobran {unidadesSobrantes} unidades de {registro.nombre}. No genera cobro.
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div aria-live="polite" className="min-h-5 text-xs">
        {excede && estado.tipo !== "error" ? (
          <p className="font-medium text-alerta-roja-texto">{MENSAJES.VENDIDO_EXCEDE_EXISTENCIA}</p>
        ) : null}
        {estado.tipo === "guardando" ? <p className="text-texto-suave">Guardando…</p> : null}
        {estado.tipo === "guardado" ? <p className="text-ok-texto">Guardado</p> : null}
        {estado.tipo === "error" ? (
          <p role="alert" className="font-medium text-alerta-roja-texto">
            {estado.mensaje}
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}
