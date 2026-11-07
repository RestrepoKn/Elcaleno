"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Insignia, type TonoInsignia } from "@/components/ui/Insignia";
import { Selector } from "@/components/ui/Selector";
import type { Sugerencia } from "@/lib/datos/tipos";
import { formatearFechaHora } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import { CATEGORIAS_SUGERENCIA, ETIQUETA_CATEGORIA, MENSAJE_MAXIMO, MENSAJE_MINIMO, type CategoriaSugerencia } from "@/lib/reglas/sugerencias";

const TONO_CATEGORIA: Record<CategoriaSugerencia, TonoInsignia> = {
  sugerencia: "reponer",
  problema: "roja",
  pedido: "amarilla",
  otro: "neutro",
};

/** Formulario del encargado para dejar una sugerencia en el buzón. */
export function FormularioSugerencia() {
  const router = useRouter();
  const [categoria, setCategoria] = useState<CategoriaSugerencia>("sugerencia");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setResultado(null);
    if (mensaje.trim().length < MENSAJE_MINIMO) {
      setResultado({ tipo: "error", texto: "Escriba su sugerencia." });
      return;
    }
    setEnviando(true);
    try {
      await llamarApi("/sugerencias", { metodo: "POST", cuerpo: { categoria, mensaje: mensaje.trim() } });
      setMensaje("");
      setCategoria("sugerencia");
      setResultado({ tipo: "exito", texto: "Gracias. Su sugerencia llegó al buzón del administrador." });
      router.refresh();
    } catch (err) {
      setResultado({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {resultado ? <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso> : null}
      <Selector
        etiqueta="Tipo"
        opciones={CATEGORIAS_SUGERENCIA.map((c) => ({ valor: c, etiqueta: ETIQUETA_CATEGORIA[c] }))}
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as CategoriaSugerencia)}
        className="sm:max-w-xs"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="mensaje-sugerencia" className="text-sm font-medium text-texto">
          Mensaje
        </label>
        <textarea
          id="mensaje-sugerencia"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          maxLength={MENSAJE_MAXIMO}
          rows={4}
          placeholder="Por ejemplo: falta hielo en la nevera del bar los viernes."
          className="min-h-28 rounded-lg border border-borde bg-superficie p-3 text-base text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primario"
        />
        <p className="text-right text-xs text-texto-suave tabular-nums">
          {mensaje.length} / {MENSAJE_MAXIMO}
        </p>
      </div>
      <div className="flex justify-end">
        <Boton type="submit" cargando={enviando}>
          Enviar al buzón
        </Boton>
      </div>
    </form>
  );
}

/** Lista de sugerencias: el administrador puede marcarlas y eliminarlas; el encargado solo ve las suyas. */
export function ListaSugerencias({ sugerencias, esAdministrador }: { sugerencias: Sugerencia[]; esAdministrador: boolean }) {
  const router = useRouter();
  const [procesando, setProcesando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accion(s: Sugerencia, tipo: "leer" | "eliminar") {
    setError(null);
    setProcesando(s.id);
    try {
      if (tipo === "eliminar") await llamarApi(`/sugerencias/${s.id}`, { metodo: "DELETE" });
      else await llamarApi(`/sugerencias/${s.id}`, { metodo: "PATCH", cuerpo: { leida: !s.leida } });
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setProcesando(null);
    }
  }

  if (sugerencias.length === 0) {
    return (
      <EstadoVacio
        titulo={esAdministrador ? "No hay sugerencias aquí" : "Aún no ha enviado sugerencias"}
        descripcion={esAdministrador ? "Cuando los encargados escriban, aparecerán en esta bandeja." : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <ul className="flex flex-col gap-2">
        {sugerencias.map((s) => (
          <li
            key={s.id}
            className={`flex flex-col gap-2 rounded-xl border bg-superficie p-4 ${!s.leida && esAdministrador ? "border-primario/40" : "border-borde"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Insignia tono={TONO_CATEGORIA[s.categoria]}>{ETIQUETA_CATEGORIA[s.categoria]}</Insignia>
                <Insignia tono={s.leida ? "ok" : "primario"}>{s.leida ? "Leída" : "Sin leer"}</Insignia>
              </div>
              <p className="text-xs text-texto-suave">{formatearFechaHora(s.createdAt)}</p>
            </div>
            <p className="whitespace-pre-line text-sm text-texto">{s.mensaje}</p>
            {esAdministrador ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-2">
                <p className="text-xs text-texto-suave">
                  De <span className="font-semibold text-texto">{s.autorNombre}</span> · {s.autorEmail}
                </p>
                <div className="flex gap-1">
                  <Boton tamano="sm" variante="secundario" cargando={procesando === s.id} onClick={() => accion(s, "leer")}>
                    {s.leida ? "Marcar sin leer" : "Marcar como leída"}
                  </Boton>
                  <Boton tamano="sm" variante="fantasma" disabled={procesando === s.id} onClick={() => accion(s, "eliminar")}>
                    Eliminar
                  </Boton>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
