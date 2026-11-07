import Link from "next/link";
import { notFound } from "next/navigation";
import { InsigniaEstadoTurno } from "@/components/inventario/InsigniaEstadoTurno";
import { PlanillaLectura } from "@/components/inventario/PlanillaLectura";
import { RevisionTurno } from "@/components/inventario/RevisionTurno";
import { Aviso } from "@/components/ui/Aviso";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { formatearFecha, formatearFechaHora, formatearPesos } from "@/lib/formato";
import { FotosTurno } from "@/components/inventario/FotosTurno";
import { listarFotos, obtenerTurno, tieneTurnoPosterior, type TurnoDetalle } from "@/lib/inventario/dataService";
import { ErrorDeNegocio } from "@/lib/reglas/errores";

export const dynamic = "force-dynamic";

/** Detalle del turno: planilla en solo lectura y, para el administrador, el resumen financiero y las acciones. */
export default async function PaginaDetalleTurno({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;
  const { id } = await params;

  let turno: TurnoDetalle;
  try {
    turno = await obtenerTurno(id, usuario.rol);
  } catch (error) {
    if (error instanceof ErrorDeNegocio && error.codigo === "TURNO_NO_ENCONTRADO") notFound();
    throw error;
  }
  const esAdministrador = usuario.rol === "administrador";
  const hayPosterior = esAdministrador && turno.estado === "en_revision" ? await tieneTurnoPosterior(turno.id) : false;

  return (
    <>
      {esAdministrador ? (
        <Link href="/inventario/turnos" className="text-sm font-semibold text-primario underline-offset-4 hover:underline">
          ← Historial
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-texto">Turno {turno.nombre}</h1>
          <p className="text-sm text-texto-suave">
            {formatearFecha(turno.fecha)} · Encargado: {turno.encargado}
          </p>
          <p className="text-xs text-texto-suave">
            {turno.entregadoAt ? `Entregado: ${formatearFechaHora(turno.entregadoAt)}` : "Aún no entregado"}
            {turno.cerradoAt ? ` · Cerrado: ${formatearFechaHora(turno.cerradoAt)}` : ""}
          </p>
        </div>
        <InsigniaEstadoTurno estado={turno.estado} />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <dt className="text-xs text-texto-suave">Venta total</dt>
          <dd className="text-xl font-bold tabular-nums">{formatearPesos(turno.ventaTotal)}</dd>
        </div>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <dt className="text-xs text-texto-suave">A cancelar por faltantes</dt>
          <dd className={`text-xl font-bold tabular-nums ${turno.totalACancelar > 0 ? "text-alerta-roja-texto" : ""}`}>
            {formatearPesos(turno.totalACancelar)}
          </dd>
        </div>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <dt className="text-xs text-texto-suave">Filas sin conteo</dt>
          <dd className="text-xl font-bold tabular-nums">{turno.sinConteo}</dd>
        </div>
      </dl>

      {esAdministrador ? (
        <RevisionTurno key={`${turno.estado}-${turno.facturasEfectivo}-${turno.pagoEncargado}`} turno={turno} hayTurnoPosterior={hayPosterior} />
      ) : turno.estado === "abierto" ? (
        <Aviso tipo="info">
          El turno está abierto. Regístrelo en{" "}
          <Link href="/inventario/turno" className="font-semibold underline">Turno actual</Link>.
        </Aviso>
      ) : null}

      <FotosTurno
        turnoId={turno.id}
        estado={turno.estado}
        rol={usuario.rol}
        email={usuario.email}
        fotosIniciales={await listarFotos(turno.id)}
      />

      <PlanillaLectura registros={turno.registros} />
    </>
  );
}
