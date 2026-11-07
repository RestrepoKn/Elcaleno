import Link from "next/link";
import { FormularioTurno } from "@/components/inventario/FormularioTurno";
import { InsigniaEstadoTurno } from "@/components/inventario/InsigniaEstadoTurno";
import { PlanillaTurno } from "@/components/inventario/PlanillaTurno";
import { Aviso } from "@/components/ui/Aviso";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { formatearFecha } from "@/lib/formato";
import { listarTurnos, obtenerTurnoAbierto } from "@/lib/inventario/dataService";
import { hoyBogota } from "@/lib/reglas/fechas";

export const dynamic = "force-dynamic";

/** Turno actual (sección 12): sin turno abierto, el formulario para abrirlo; con turno abierto, la planilla. */
export default async function PaginaTurno() {
  const usuario = await obtenerUsuario();
  if (!usuario) return null; // el layout ya muestra "sin acceso"

  const turno = await obtenerTurnoAbierto(usuario.rol);
  if (turno) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-texto">Turno {turno.nombre}</h1>
            <p className="text-sm text-texto-suave">
              {formatearFecha(turno.fecha)} · Encargado: {turno.encargado}
            </p>
          </div>
          <InsigniaEstadoTurno estado={turno.estado} />
        </div>
        <p className="text-sm text-texto-suave">
          Escriba la entrada, la cantidad vendida y el conteo físico de cada producto. Cada dato se guarda al salir
          del campo; el inventario final y el total se calculan solos.
        </p>
        <PlanillaTurno turno={turno} rol={usuario.rol} />
      </>
    );
  }

  const enRevision = (await listarTurnos(10, usuario.rol)).filter((t) => t.estado === "en_revision");

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-texto">Turno actual</h1>
        <p className="text-sm text-texto-suave">No hay un turno abierto.</p>
      </div>
      {enRevision.map((t) => (
        <Aviso key={t.id} tipo="info" titulo={`Turno ${t.nombre} del ${formatearFecha(t.fecha)}: en revisión`}>
          {usuario.rol === "administrador"
            ? "Está esperando su revisión: facturas, pago y cierre. "
            : "El administrador lo está revisando. "}
          <Link href={`/inventario/turnos/${t.id}`} className="font-semibold underline underline-offset-4">
            {usuario.rol === "administrador" ? "Revisar y cerrar" : "Ver la planilla"}
          </Link>
        </Aviso>
      ))}
      <Tarjeta>
        <h2 className="mb-4 text-lg font-semibold text-texto">Abrir turno</h2>
        <FormularioTurno fechaHoy={hoyBogota()} />
      </Tarjeta>
    </>
  );
}
