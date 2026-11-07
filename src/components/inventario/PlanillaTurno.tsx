"use client";

import { MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilaRegistro } from "@/components/inventario/FilaRegistro";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Modal } from "@/components/ui/Modal";
import type { RegistroTurno, Rol, TurnoDetalle } from "@/lib/datos/tipos";
import { formatearPesos } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import type { Seccion } from "@/lib/reglas/producto";
import { valorVentaTotal } from "@/lib/reglas/turno";

const SECCIONES: { seccion: Seccion; titulo: string }[] = [
  { seccion: "bar", titulo: "Bar" },
  { seccion: "helados", titulo: "Helados" },
];

/** Planilla digital del turno abierto (CU-04 a CU-07), en dos secciones: Bar y Helados. */
export function PlanillaTurno({ turno, rol }: { turno: TurnoDetalle; rol: Rol }) {
  const router = useRouter();
  const [registros, setRegistros] = useState<RegistroTurno[]>(turno.registros);
  const [confirmando, setConfirmando] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = turno.estado === "abierto";
  const sinConteo = registros.filter((r) => r.contado === null).length;
  const venta = valorVentaTotal(registros.map((r) => r.totalVenta));
  const aCancelar = registros.reduce((suma, r) => suma + r.valorACancelar, 0);

  function actualizar(nuevo: RegistroTurno) {
    setRegistros((lista) => lista.map((r) => (r.id === nuevo.id ? nuevo : r)));
  }

  async function entregar() {
    setError(null);
    setEntregando(true);
    try {
      await llamarApi(`/turnos/${turno.id}/entregar`, { metodo: "POST" });
      setConfirmando(false);
      router.refresh();
    } catch (err) {
      setConfirmando(false);
      setError(mensajeDeError(err));
    } finally {
      setEntregando(false);
    }
  }

  if (registros.length === 0) {
    return (
      <EstadoVacio
        titulo="El turno no tiene productos"
        descripcion={
          rol === "administrador"
            ? "Registre productos en la sección Productos: entran a este turno con inicial 0."
            : "Pida al administrador que registre los productos."
        }
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8 pb-28">
        {rol === "administrador" && editable ? (
          <Aviso tipo="info">Como administrador puede ajustar el inicial. El encargado lo ve en solo lectura.</Aviso>
        ) : null}

        {SECCIONES.map(({ seccion, titulo }) => {
          const filas = registros.filter((r) => r.seccion === seccion);
          if (filas.length === 0) return null;
          return (
            <section key={seccion} aria-labelledby={`planilla-${seccion}`} className="flex flex-col gap-3">
              <h2 id={`planilla-${seccion}`} className="text-lg font-semibold text-texto">
                {titulo} <span className="text-sm font-normal text-texto-suave">· {filas.length} productos</span>
              </h2>
              <ul className="flex flex-col gap-3">
                {filas.map((r) => (
                  <FilaRegistro
                    key={r.id}
                    turnoId={turno.id}
                    registro={r}
                    editable={editable}
                    puedeEditarInicial={rol === "administrador"}
                    alActualizar={actualizar}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Resumen fijo abajo: venta, faltantes y entrega. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-superficie/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-texto-suave">Venta total</dt>
              <dd className="font-semibold tabular-nums text-texto">{formatearPesos(venta)}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">A cancelar por faltantes</dt>
              <dd className={`font-semibold tabular-nums ${aCancelar > 0 ? "text-alerta-roja-texto" : "text-texto"}`}>
                {formatearPesos(aCancelar)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Filas sin conteo</dt>
              <dd className={`font-semibold tabular-nums ${sinConteo > 0 ? "text-alerta-amarilla-texto" : "text-ok-texto"}`}>
                {sinConteo}
              </dd>
            </div>
          </dl>
          {editable ? (
            <Boton tamano="lg" onClick={() => setConfirmando(true)}>
              Entregar turno
            </Boton>
          ) : null}
        </div>
        {error ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        ) : null}
      </div>

      <Modal
        abierto={confirmando}
        titulo="Entregar el turno"
        onCerrar={() => setConfirmando(false)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton onClick={entregar} cargando={entregando}>
              Entregar
            </Boton>
          </>
        }
      >
        <p>Entregar el turno para revisión. Después de entregarlo no podrá modificar los datos.</p>
        {sinConteo > 0 ? (
          <p className="mt-2 font-medium text-alerta-amarilla-texto">
            Aún hay {sinConteo} {sinConteo === 1 ? "fila" : "filas"} sin conteo físico: la entrega se rechazará.
          </p>
        ) : null}
      </Modal>
    </MotionConfig>
  );
}
