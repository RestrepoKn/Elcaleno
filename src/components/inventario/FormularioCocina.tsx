"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CANTIDAD_MAXIMA } from "@/lib/config/inventario";
import type { RegistroCocina } from "@/lib/datos/tipos";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";

function leer(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isInteger(n) && n >= 0 && n <= CANTIDAD_MAXIMA ? n : Number.NaN;
}

/** CU-13: existencia inicial y salida; el inventario final esperado se ve al escribir (RN-17). */
export function FormularioCocina({ fechaHoy, sugerencias }: { fechaHoy: string; sugerencias: string[] }) {
  const router = useRouter();
  const [producto, setProducto] = useState("");
  const [fecha, setFecha] = useState(fechaHoy);
  const [existencia, setExistencia] = useState("");
  const [salida, setSalida] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const e = leer(existencia);
  const s = leer(salida);
  const final = e !== null && s !== null && !Number.isNaN(e) && !Number.isNaN(s) && s <= e ? e - s : null;
  const excede = e !== null && s !== null && !Number.isNaN(e) && !Number.isNaN(s) && s > e;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    const nuevos: Record<string, string> = {};
    if (producto.trim() === "") nuevos.producto = "Escriba el producto.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) nuevos.fecha = "Elija la fecha.";
    if (e === null || Number.isNaN(e)) nuevos.existencia = `Entero entre 0 y ${CANTIDAD_MAXIMA}.`;
    if (s === null || Number.isNaN(s)) nuevos.salida = `Entero entre 0 y ${CANTIDAD_MAXIMA}.`;
    else if (excede) nuevos.salida = "La salida no puede superar la existencia inicial.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      const r = await llamarApi<RegistroCocina>("/cocina", {
        metodo: "POST",
        cuerpo: { producto: producto.trim(), fecha, existenciaInicial: e, salida: s },
      });
      setMensaje({ tipo: "exito", texto: `${r.producto}: inventario final esperado ${r.finalEsperado}.` });
      setProducto("");
      setExistencia("");
      setSalida("");
      router.refresh();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Producto"
          value={producto}
          onChange={(ev) => setProducto(ev.target.value)}
          maxLength={160}
          list="productos-cocina"
          autoComplete="off"
          error={errores.producto}
        />
        <datalist id="productos-cocina">
          {sugerencias.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Campo etiqueta="Fecha" type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} error={errores.fecha} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo
          etiqueta="Existencia inicial"
          inputMode="numeric"
          value={existencia}
          onChange={(ev) => setExistencia(ev.target.value.replace(/[^\d]/g, ""))}
          error={errores.existencia}
        />
        <Campo
          etiqueta="Salida"
          inputMode="numeric"
          value={salida}
          onChange={(ev) => setSalida(ev.target.value.replace(/[^\d]/g, ""))}
          error={errores.salida ?? (excede ? "Supera la existencia inicial." : undefined)}
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto">Final esperado</span>
          <output className="flex min-h-11 items-center justify-center rounded-lg bg-primario-suave text-lg font-semibold tabular-nums text-primario-oscuro">
            {final ?? "—"}
          </output>
        </div>
      </div>
      <div className="flex justify-end">
        <Boton type="submit" cargando={guardando}>
          Registrar
        </Boton>
      </div>
    </form>
  );
}
