import { InsigniaAlerta } from "@/components/inventario/InsigniaAlerta";
import type { FilaInventario } from "@/lib/datos/tipos";
import type { Seccion } from "@/lib/reglas/producto";

const TITULO: Record<Seccion, string> = { bar: "Bar", helados: "Helados" };
const AYUDA: Record<Seccion, string> = {
  bar: "Por reponer con menos de 6 unidades.",
  helados: "Amarilla con menos de 5 unidades; roja con menos de 3.",
};

function Origen({ conteo }: { conteo: boolean }) {
  return <span className="text-xs text-texto-suave">{conteo ? "Conteo físico" : "Calculado"}</span>;
}

function Bloque({ seccion, filas }: { seccion: Seccion; filas: FilaInventario[] }) {
  const conAlerta = filas.filter((f) => f.nivelAlerta !== "ninguna").length;
  return (
    <section aria-labelledby={`seccion-${seccion}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`seccion-${seccion}`} className="text-lg font-semibold text-texto">
          {TITULO[seccion]}
        </h2>
        <p className="text-sm text-texto-suave">
          {filas.length} {filas.length === 1 ? "producto" : "productos"} · {conAlerta} con alerta
        </p>
      </div>
      <p className="text-xs text-texto-suave">{AYUDA[seccion]}</p>

      {/* Móvil: tarjetas apiladas */}
      <ul className="flex flex-col gap-2 md:hidden">
        {filas.map((f) => (
          <li key={f.productoId} className="flex items-center justify-between gap-3 rounded-xl border border-borde bg-superficie p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-texto">{f.nombre}</p>
              <p className="text-xs text-texto-suave">
                {f.categoria} · <Origen conteo={f.conteoFisico} />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xl font-semibold tabular-nums text-texto">{f.inventario}</span>
              <InsigniaAlerta nivel={f.nivelAlerta} />
            </div>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-borde bg-superficie md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Inventario actual de {TITULO[seccion]}</caption>
          <thead className="bg-fondo text-xs uppercase tracking-wide text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Inventario</th>
              <th scope="col" className="px-4 py-3 font-semibold">Origen</th>
              <th scope="col" className="px-4 py-3 font-semibold">Alerta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {filas.map((f) => (
              <tr key={f.productoId}>
                <th scope="row" className="px-4 py-3 font-medium text-texto">{f.nombre}</th>
                <td className="px-4 py-3 text-texto-suave">{f.categoria}</td>
                <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-texto">{f.inventario}</td>
                <td className="px-4 py-3"><Origen conteo={f.conteoFisico} /></td>
                <td className="px-4 py-3"><InsigniaAlerta nivel={f.nivelAlerta} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Inventario actual en dos bloques, Bar y Helados (sección 12). */
export function TablaInventario({ filas }: { filas: FilaInventario[] }) {
  const secciones: Seccion[] = ["bar", "helados"];
  return (
    <div className="flex flex-col gap-8">
      {secciones.map((s) => {
        const deSeccion = filas.filter((f) => f.seccion === s);
        return deSeccion.length > 0 ? <Bloque key={s} seccion={s} filas={deSeccion} /> : null;
      })}
    </div>
  );
}
