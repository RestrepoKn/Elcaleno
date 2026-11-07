import Link from "next/link";
import { InsigniaEstadoTurno } from "@/components/inventario/InsigniaEstadoTurno";
import type { TurnoResumen } from "@/lib/datos/tipos";
import { formatearFecha, formatearPesos } from "@/lib/formato";

function Neto({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-texto-suave">—</span>;
  return <span className={valor < 0 ? "text-alerta-roja-texto" : "text-texto"}>{formatearPesos(valor)}</span>;
}

/** Historial de turnos (CU-12): venta total, faltantes y resultado neto por turno. */
export function TablaHistorial({ turnos }: { turnos: TurnoResumen[] }) {
  return (
    <>
      {/* Móvil */}
      <ul className="flex flex-col gap-2 md:hidden">
        {turnos.map((t) => (
          <li key={t.id}>
            <Link
              href={`/inventario/turnos/${t.id}`}
              className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-4 hover:bg-primario-suave/40
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-texto">{t.nombre}</p>
                <InsigniaEstadoTurno estado={t.estado} />
              </div>
              <p className="text-sm text-texto-suave">{formatearFecha(t.fecha)} · {t.encargado}</p>
              <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
                <div><dt className="text-xs text-texto-suave">Venta</dt><dd className="font-semibold">{formatearPesos(t.ventaTotal)}</dd></div>
                <div><dt className="text-xs text-texto-suave">Faltantes</dt><dd className={t.totalACancelar > 0 ? "font-semibold text-alerta-roja-texto" : ""}>{formatearPesos(t.totalACancelar)}</dd></div>
                <div><dt className="text-xs text-texto-suave">Neto</dt><dd className="font-semibold"><Neto valor={t.resultadoNetoCierre ?? t.resultadoNeto} /></dd></div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {/* Escritorio */}
      <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Historial de turnos</caption>
          <thead className="bg-fondo text-xs uppercase tracking-wide text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Fecha</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Turno</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Encargado</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Venta total</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">A cancelar</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Resultado neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde tabular-nums">
            {turnos.map((t) => (
              <tr key={t.id} className="hover:bg-primario-suave/40">
                <td className="px-4 py-3">{formatearFecha(t.fecha)}</td>
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <Link href={`/inventario/turnos/${t.id}`} className="text-primario underline-offset-4 hover:underline">
                    {t.nombre}
                  </Link>
                </th>
                <td className="px-4 py-3">{t.encargado}</td>
                <td className="px-4 py-3"><InsigniaEstadoTurno estado={t.estado} /></td>
                <td className="px-4 py-3 text-right font-semibold">{formatearPesos(t.ventaTotal)}</td>
                <td className={`px-4 py-3 text-right ${t.totalACancelar > 0 ? "font-semibold text-alerta-roja-texto" : ""}`}>
                  {formatearPesos(t.totalACancelar)}
                </td>
                <td className="px-4 py-3 text-right font-semibold"><Neto valor={t.resultadoNetoCierre ?? t.resultadoNeto} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
