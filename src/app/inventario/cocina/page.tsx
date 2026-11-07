import { FormularioCocina } from "@/components/inventario/FormularioCocina";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearFecha } from "@/lib/formato";
import { listarCocina, productosDeCocina } from "@/lib/inventario/dataService";
import { esFechaValida, hoyBogota } from "@/lib/reglas/fechas";

export const dynamic = "force-dynamic";

/** F5 · Turno de cocina (opcional): existencia inicial, salida e inventario final esperado. Ambos roles. */
export default async function PaginaCocina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const hoy = hoyBogota();
  const crudo = (await searchParams).fecha;
  const fecha = typeof crudo === "string" && esFechaValida(crudo) ? crudo : hoy;
  const [registros, sugerencias] = await Promise.all([listarCocina(fecha), productosDeCocina()]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-texto">Cocina</h1>
        <p className="text-sm text-texto-suave">Inventario final esperado = existencia inicial − salida.</p>
      </div>

      <Tarjeta>
        <h2 className="mb-4 text-lg font-semibold text-texto">Registrar</h2>
        <FormularioCocina fechaHoy={hoy} sugerencias={sugerencias} />
      </Tarjeta>

      <section className="flex flex-col gap-3" aria-labelledby="registros-cocina">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="registros-cocina" className="text-lg font-semibold text-texto">
            Registros del {formatearFecha(fecha)}
          </h2>
          <form method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-texto">
              Ver fecha
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="min-h-11 rounded-lg border border-borde bg-superficie px-3 text-base text-texto focus-visible:outline-2 focus-visible:outline-primario"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-borde bg-superficie px-4 text-sm font-semibold text-texto hover:bg-primario-suave focus-visible:outline-2 focus-visible:outline-primario"
            >
              Ver
            </button>
          </form>
        </div>
        {registros.length === 0 ? (
          <EstadoVacio titulo="Sin registros en esta fecha" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
            <table className="w-full text-sm">
              <caption className="sr-only">Registros de cocina del {formatearFecha(fecha)}</caption>
              <thead className="bg-fondo text-xs uppercase tracking-wide text-texto-suave">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Producto</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Existencia</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Salida</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Final esperado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde tabular-nums">
                {registros.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-texto">{r.producto}</th>
                    <td className="px-4 py-3 text-right">{r.existenciaInicial}</td>
                    <td className="px-4 py-3 text-right">{r.salida}</td>
                    <td className="px-4 py-3 text-right font-semibold">{r.finalEsperado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
