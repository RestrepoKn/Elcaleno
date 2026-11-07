import type { RegistroTurno } from "@/lib/datos/tipos";
import { formatearPesos } from "@/lib/formato";
import type { Seccion } from "@/lib/reglas/producto";

const SECCIONES: { seccion: Seccion; titulo: string }[] = [
  { seccion: "bar", titulo: "Bar" },
  { seccion: "helados", titulo: "Helados" },
];

function Resultado({ r }: { r: RegistroTurno }) {
  if (r.estadoConteo === "faltante") {
    return (
      <span className="font-semibold text-alerta-roja-texto">
        Faltan {r.faltante} · {formatearPesos(r.valorACancelar)}
      </span>
    );
  }
  if (r.estadoConteo === "sobrante") return <span className="font-semibold text-sobrante">Sobran {r.sobrante}</span>;
  if (r.estadoConteo === "cuadra") return <span className="font-semibold text-ok-texto">Cuadra</span>;
  return <span className="text-texto-suave">Sin conteo</span>;
}

/** Planilla del turno en solo lectura: revisión del administrador y turnos cerrados (sección 12). */
export function PlanillaLectura({ registros }: { registros: RegistroTurno[] }) {
  return (
    <div className="flex flex-col gap-6">
      {SECCIONES.map(({ seccion, titulo }) => {
        const filas = registros.filter((r) => r.seccion === seccion);
        if (filas.length === 0) return null;
        const venta = filas.reduce((s, r) => s + r.totalVenta, 0);
        return (
          <section key={seccion} aria-labelledby={`lectura-${seccion}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`lectura-${seccion}`} className="text-lg font-semibold text-texto">{titulo}</h2>
              <p className="text-sm text-texto-suave">
                Venta {titulo.toLowerCase()}: <span className="font-semibold tabular-nums text-texto">{formatearPesos(venta)}</span>
              </p>
            </div>

            {/* Móvil */}
            <ul className="flex flex-col gap-2 md:hidden">
              {filas.map((r) => (
                <li key={r.id} className={`rounded-xl border bg-superficie p-3 ${r.estadoConteo === "faltante" ? "border-alerta-roja/40" : "border-borde"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-texto">{r.nombre}</p>
                    <p className="text-sm tabular-nums text-texto-suave">{formatearPesos(r.valorUnitario)}</p>
                  </div>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-center text-sm tabular-nums">
                    <div><dt className="text-xs text-texto-suave">Inicial</dt><dd>{r.inicial}</dd></div>
                    <div><dt className="text-xs text-texto-suave">Entrada</dt><dd>{r.entrada}</dd></div>
                    <div><dt className="text-xs text-texto-suave">Vendida</dt><dd>{r.vendida}</dd></div>
                    <div><dt className="text-xs text-texto-suave">Final</dt><dd className="font-semibold">{r.finalCalculado}</dd></div>
                  </dl>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span>Contado: <span className="font-semibold tabular-nums">{r.contado ?? "—"}</span></span>
                    <Resultado r={r} />
                  </div>
                  <p className="mt-1 text-right text-xs text-texto-suave">
                    Total venta <span className="tabular-nums">{formatearPesos(r.totalVenta)}</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Escritorio */}
            <div className="hidden overflow-x-auto rounded-xl border border-borde bg-superficie md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Planilla de {titulo}</caption>
                <thead className="bg-fondo text-xs uppercase tracking-wide text-texto-suave">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Producto</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Inicial</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Entrada</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Vendida</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Inv. final</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Valor</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Total venta</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Contado</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Conteo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde tabular-nums">
                  {filas.map((r) => (
                    <tr key={r.id} className={r.estadoConteo === "faltante" ? "bg-alerta-roja/5" : ""}>
                      <th scope="row" className="px-3 py-2 text-left font-medium text-texto">{r.nombre}</th>
                      <td className="px-3 py-2 text-right">{r.inicial}</td>
                      <td className="px-3 py-2 text-right">{r.entrada}</td>
                      <td className="px-3 py-2 text-right">{r.vendida}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.finalCalculado}</td>
                      <td className="px-3 py-2 text-right text-texto-suave">{formatearPesos(r.valorUnitario)}</td>
                      <td className="px-3 py-2 text-right">{formatearPesos(r.totalVenta)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.contado ?? "—"}</td>
                      <td className="px-3 py-2 text-left"><Resultado r={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
