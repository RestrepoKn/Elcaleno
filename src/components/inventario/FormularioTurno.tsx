"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";

// El turno cubre el día completo: el nombre viene listo y solo se cambia si hay otro turno en la misma fecha.
const NOMBRE_POR_DEFECTO = "Completo";

/** CU-03: abre el turno con fecha (hoy por defecto), nombre libre (D-4) y encargado. */
export function FormularioTurno({ fechaHoy, encargadoSugerido }: { fechaHoy: string; encargadoSugerido?: string }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(fechaHoy);
  const [nombre, setNombre] = useState(NOMBRE_POR_DEFECTO);
  const [encargado, setEncargado] = useState(encargadoSugerido ?? "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) e.fecha = "Elija la fecha del turno.";
    if (nombre.trim() === "") e.nombre = `Escriba el nombre del turno (por ejemplo, ${NOMBRE_POR_DEFECTO}).`;
    if (encargado.trim() === "") e.encargado = "Escriba el nombre del encargado.";
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setAbriendo(true);
    try {
      await llamarApi("/turnos", {
        metodo: "POST",
        cuerpo: { fecha, nombre: nombre.trim(), encargado: encargado.trim() },
      });
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          etiqueta="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={errores.fecha}
          required
        />
        <Campo
          etiqueta="Nombre del turno"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={40}
          autoComplete="off"
          error={errores.nombre}
          ayuda="El turno cubre el día completo. Cámbielo solo si abre otro turno en la misma fecha."
          required
        />
        <Campo
          etiqueta="Encargado"
          value={encargado}
          onChange={(e) => setEncargado(e.target.value)}
          maxLength={80}
          autoComplete="off"
          error={errores.encargado}
          required
        />
      </div>
      <p className="text-sm text-texto-suave">
        Cada producto activo entra al turno con su inicial sugerido (el conteo del turno anterior) y su valor actual.
      </p>
      <div className="flex justify-end">
        <Boton type="submit" tamano="lg" cargando={abriendo}>
          Abrir turno
        </Boton>
      </div>
    </form>
  );
}
