"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Modal } from "@/components/ui/Modal";
import { formatearFecha } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import type { EstadoTurno } from "@/lib/reglas/turno";

/** Botón "Eliminar" del administrador, con confirmación. Tras eliminar, vuelve al historial. */
export function EliminarTurno({
  turnoId,
  nombre,
  fecha,
  estado,
  tamano = "sm",
}: {
  turnoId: string;
  nombre: string;
  fecha: string;
  estado: EstadoTurno;
  tamano?: "sm" | "md";
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    setError(null);
    setEliminando(true);
    try {
      await llamarApi(`/turnos/${turnoId}`, { metodo: "DELETE" });
      setAbierto(false);
      router.push("/inventario/turnos");
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <Boton variante="fantasma" tamano={tamano} onClick={() => setAbierto(true)} aria-label={`Eliminar el turno ${nombre} del ${formatearFecha(fecha)}`}>
        Eliminar
      </Boton>
      <Modal
        abierto={abierto}
        titulo="Eliminar el turno"
        onCerrar={() => setAbierto(false)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={eliminar} cargando={eliminando}>
              Eliminar definitivamente
            </Boton>
          </>
        }
      >
        <p>
          Se eliminará el turno <strong>{nombre}</strong> del {formatearFecha(fecha)} con toda su planilla y sus fotos de
          facturas. Esta acción no se puede deshacer.
        </p>
        <p className="mt-2 text-texto-suave">
          El inventario actual y el inicial del próximo turno volverán a tomar los datos del turno anterior.
        </p>
        {estado === "cerrado" ? (
          <p className="mt-2 font-medium text-alerta-roja-texto">
            Es un turno cerrado: se borra su registro oficial (venta total y resultado neto).
          </p>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
