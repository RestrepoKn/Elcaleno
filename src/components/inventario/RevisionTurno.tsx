"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { TurnoDetalle } from "@/lib/datos/tipos";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import { resultadoNeto } from "@/lib/reglas/turno";

function leerMonto(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
}

function Linea({ etiqueta, valor, negativo = false, total = false }: { etiqueta: string; valor: string; negativo?: boolean; total?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${total ? "border-t border-borde pt-3" : ""}`}>
      <dt className={total ? "font-semibold text-texto" : "text-texto-suave"}>{etiqueta}</dt>
      <dd className={`tabular-nums ${total ? "text-xl font-bold" : "font-semibold"} ${negativo ? "text-alerta-roja-texto" : "text-texto"}`}>
        {valor}
      </dd>
    </div>
  );
}

/**
 * Revisión del turno por el administrador (CU-08, CU-09, CU-10; sección 7.3):
 * facturas en efectivo y pago al encargado, resultado neto en vivo, cerrar o devolver.
 */
export function RevisionTurno({ turno, hayTurnoPosterior }: { turno: TurnoDetalle; hayTurnoPosterior: boolean }) {
  const router = useRouter();
  const [facturas, setFacturas] = useState(turno.facturasEfectivo === null ? "" : String(turno.facturasEfectivo));
  const [pago, setPago] = useState(turno.pagoEncargado === null ? "" : String(turno.pagoEncargado));
  const [guardando, setGuardando] = useState(false);
  const [accion, setAccion] = useState<"cerrar" | "devolver" | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const [errores, setErrores] = useState<{ facturas?: string; pago?: string }>({});

  const cerrado = turno.estado === "cerrado";
  const f = leerMonto(facturas);
  const p = leerMonto(pago);
  const montosValidos = f !== null && p !== null && !Number.isNaN(f) && !Number.isNaN(p);
  const neto = montosValidos ? resultadoNeto(turno.ventaTotal, f, p) : null;
  const guardados =
    turno.facturasEfectivo !== null && turno.pagoEncargado !== null && f === turno.facturasEfectivo && p === turno.pagoEncargado;

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    const e: { facturas?: string; pago?: string } = {};
    if (f === null || Number.isNaN(f)) e.facturas = "Pesos enteros, 0 o más.";
    if (p === null || Number.isNaN(p)) e.pago = "Pesos enteros, 0 o más.";
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    try {
      await llamarApi(`/turnos/${turno.id}/finanzas`, { metodo: "PUT", cuerpo: { facturasEfectivo: f, pagoEncargado: p } });
      setMensaje({ tipo: "exito", texto: "Facturas y pago guardados." });
      router.refresh();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutar() {
    if (!accion) return;
    setMensaje(null);
    setProcesando(true);
    try {
      await llamarApi(`/turnos/${turno.id}/${accion}`, { metodo: "POST" });
      setAccion(null);
      router.refresh();
    } catch (err) {
      setAccion(null);
      setMensaje({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setProcesando(false);
    }
  }

  // Turno cerrado: valores guardados al cerrar, en solo lectura (RN-14).
  if (cerrado) {
    const netoCierre = turno.resultadoNetoCierre ?? 0;
    return (
      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold text-texto">Resumen financiero</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Linea etiqueta="Venta total (bar + helados)" valor={formatearPesos(turno.ventaTotalCierre ?? turno.ventaTotal)} />
          <Linea etiqueta="Facturas canceladas en efectivo" valor={`− ${formatearPesos(turno.facturasEfectivo ?? 0)}`} />
          <Linea etiqueta="Pago al encargado" valor={`− ${formatearPesos(turno.pagoEncargado ?? 0)}`} />
          <Linea etiqueta="Resultado neto" valor={formatearPesos(netoCierre)} negativo={netoCierre < 0} total />
        </dl>
        <p className="mt-3 text-xs text-texto-suave">Turno cerrado: ya no se puede modificar.</p>
      </Tarjeta>
    );
  }

  return (
    <>
      <Tarjeta>
        <h2 className="mb-1 text-lg font-semibold text-texto">Resumen financiero</h2>
        <p className="mb-4 text-sm text-texto-suave">Informativo: no genera cobros ni ajustes. Puede dar negativo.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
            <Campo
              etiqueta="Facturas canceladas en efectivo (pesos)"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={facturas}
              onChange={(e) => setFacturas(e.target.value)}
              error={errores.facturas}
              ayuda="Efectivo pagado desde la caja durante el turno. Puede ser 0."
            />
            <Campo
              etiqueta="Pago al encargado (pesos)"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={pago}
              onChange={(e) => setPago(e.target.value)}
              error={errores.pago}
              ayuda="Puede ser 0."
            />
            <div className="flex justify-end">
              <Boton type="submit" variante="secundario" cargando={guardando} disabled={guardados}>
                {guardados ? "Guardado" : "Guardar facturas y pago"}
              </Boton>
            </div>
          </form>

          <dl className="flex flex-col gap-2 rounded-xl bg-fondo p-4 text-sm" aria-live="polite">
            <Linea etiqueta="Venta total (bar + helados)" valor={formatearPesos(turno.ventaTotal)} />
            <Linea etiqueta="Facturas en efectivo" valor={f !== null && !Number.isNaN(f) ? `− ${formatearPesos(f)}` : "—"} />
            <Linea etiqueta="Pago al encargado" valor={p !== null && !Number.isNaN(p) ? `− ${formatearPesos(p)}` : "—"} />
            <Linea
              etiqueta="Resultado neto"
              valor={neto === null ? "—" : formatearPesos(neto)}
              negativo={neto !== null && neto < 0}
              total
            />
            {turno.totalACancelar > 0 ? (
              <p className="mt-1 text-xs text-alerta-roja-texto">
                Faltantes a cargo del encargado ({turno.encargado}): {formatearPesos(turno.totalACancelar)}. No entran en el resultado neto.
              </p>
            ) : null}
          </dl>
        </div>
      </Tarjeta>

      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}

      {turno.estado === "en_revision" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Boton
            variante="secundario"
            tamano="lg"
            onClick={() => setAccion("devolver")}
            disabled={hayTurnoPosterior}
            title={hayTurnoPosterior ? "Ya existe un turno posterior: no se puede devolver." : undefined}
          >
            Devolver al encargado
          </Boton>
          <Boton tamano="lg" onClick={() => setAccion("cerrar")}>
            Cerrar turno
          </Boton>
        </div>
      ) : null}
      {turno.estado === "en_revision" && hayTurnoPosterior ? (
        <p className="text-right text-xs text-texto-suave">No se puede devolver: ya existe un turno posterior.</p>
      ) : null}
      {turno.estado === "abierto" ? (
        <Aviso tipo="info">El turno sigue abierto. El encargado debe entregarlo antes de cerrarlo.</Aviso>
      ) : null}

      <Modal
        abierto={accion !== null}
        titulo={accion === "cerrar" ? "Cerrar el turno" : "Devolver al encargado"}
        onCerrar={() => setAccion(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setAccion(null)}>
              Cancelar
            </Boton>
            <Boton variante={accion === "cerrar" ? "primario" : "secundario"} onClick={ejecutar} cargando={procesando}>
              {accion === "cerrar" ? "Cerrar turno" : "Devolver"}
            </Boton>
          </>
        }
      >
        {accion === "cerrar" ? (
          <>
            <p>
              Cerrar el turno {turno.nombre} del {formatearFecha(turno.fecha)}. Resultado neto:{" "}
              <strong className="tabular-nums">
                {turno.resultadoNeto === null ? "—" : formatearPesos(turno.resultadoNeto)}
              </strong>
              . Esta acción no se puede deshacer.
            </p>
            {!guardados && montosValidos ? (
              <p className="mt-2 font-medium text-alerta-amarilla-texto">
                Hay cambios en facturas o pago sin guardar: se cerrará con los valores guardados.
              </p>
            ) : null}
            {turno.facturasEfectivo === null || turno.pagoEncargado === null ? (
              <p className="mt-2 font-medium text-alerta-amarilla-texto">
                Faltan facturas o pago por guardar: el cierre se rechazará.
              </p>
            ) : null}
          </>
        ) : (
          <p>El turno vuelve a estar abierto y el encargado podrá corregir la planilla y entregarlo de nuevo.</p>
        )}
      </Modal>
    </>
  );
}
