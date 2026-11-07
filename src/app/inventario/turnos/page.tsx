import { SinPermiso } from "@/components/inventario/SinPermiso";
import { TablaHistorial } from "@/components/inventario/TablaHistorial";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { LIMITE_LISTADO } from "@/lib/config/inventario";
import { formatearPesos } from "@/lib/formato";
import { listarTurnos } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** Historial de turnos y resumen financiero (CU-12, solo administrador). */
export default async function PaginaHistorial() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "administrador") return <SinPermiso />;
  const turnos = await listarTurnos(LIMITE_LISTADO, usuario.rol);

  const cerrados = turnos.filter((t) => t.estado === "cerrado");
  const venta = cerrados.reduce((s, t) => s + (t.ventaTotalCierre ?? t.ventaTotal), 0);
  const faltantes = cerrados.reduce((s, t) => s + t.totalACancelar, 0);
  const neto = cerrados.reduce((s, t) => s + (t.resultadoNetoCierre ?? 0), 0);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-texto">Historial de turnos</h1>
        <p className="text-sm text-texto-suave">Los {LIMITE_LISTADO} turnos más recientes. Toque un turno para ver su detalle.</p>
      </div>

      {cerrados.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-borde bg-superficie p-4">
            <dt className="text-xs text-texto-suave">Venta de turnos cerrados ({cerrados.length})</dt>
            <dd className="text-xl font-bold tabular-nums text-texto">{formatearPesos(venta)}</dd>
          </div>
          <div className="rounded-xl border border-borde bg-superficie p-4">
            <dt className="text-xs text-texto-suave">Faltantes a cancelar</dt>
            <dd className={`text-xl font-bold tabular-nums ${faltantes > 0 ? "text-alerta-roja-texto" : "text-texto"}`}>{formatearPesos(faltantes)}</dd>
          </div>
          <div className="rounded-xl border border-borde bg-superficie p-4">
            <dt className="text-xs text-texto-suave">Resultado neto acumulado</dt>
            <dd className={`text-xl font-bold tabular-nums ${neto < 0 ? "text-alerta-roja-texto" : "text-texto"}`}>{formatearPesos(neto)}</dd>
          </div>
        </dl>
      ) : null}

      {turnos.length === 0 ? (
        <EstadoVacio titulo="Aún no hay turnos" descripcion="Los turnos aparecen aquí después de abrirlos en Turno actual." />
      ) : (
        <TablaHistorial turnos={turnos} />
      )}
    </>
  );
}
