import Link from "next/link";
import { TablaInventario } from "@/components/inventario/TablaInventario";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { inventarioActual } from "@/lib/inventario/dataService";
import type { Seccion } from "@/lib/reglas/producto";
import { esquemaFiltrosInventario } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

type Filtros = { seccion?: Seccion | undefined; soloPorReponer?: boolean | undefined };

function enlace(f: Filtros): string {
  const q = new URLSearchParams();
  if (f.seccion) q.set("seccion", f.seccion);
  if (f.soloPorReponer) q.set("soloPorReponer", "true");
  const texto = q.toString();
  return texto ? `/inventario?${texto}` : "/inventario";
}

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario
        ${activo ? "bg-primario text-white" : "border border-borde bg-superficie text-texto hover:bg-primario-suave"}`}
    >
      {children}
    </Link>
  );
}

/** CU-11: inventario actual con alertas, para ambos roles. */
export default async function PaginaInventario({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const crudo = await searchParams;
  const leido = esquemaFiltrosInventario.safeParse({
    seccion: typeof crudo.seccion === "string" ? crudo.seccion : undefined,
    soloPorReponer: typeof crudo.soloPorReponer === "string" ? crudo.soloPorReponer : undefined,
  });
  const filtros: Filtros = leido.success ? leido.data : {};
  const filas = await inventarioActual(filtros);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-texto">Inventario actual</h1>
        <p className="text-sm text-texto-suave">
          Último inventario de cada producto: el conteo físico si existe; si no, el calculado.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Sección" className="flex flex-wrap gap-2">
          <Filtro href={enlace({ ...filtros, seccion: undefined })} activo={!filtros.seccion}>Todas</Filtro>
          <Filtro href={enlace({ ...filtros, seccion: "bar" })} activo={filtros.seccion === "bar"}>Bar</Filtro>
          <Filtro href={enlace({ ...filtros, seccion: "helados" })} activo={filtros.seccion === "helados"}>Helados</Filtro>
        </div>
        <Filtro
          href={enlace({ ...filtros, soloPorReponer: !filtros.soloPorReponer })}
          activo={filtros.soloPorReponer === true}
        >
          {filtros.soloPorReponer ? "Mostrando solo por reponer" : "Solo por reponer"}
        </Filtro>
      </div>

      {filas.length === 0 ? (
        filtros.soloPorReponer ? (
          <EstadoVacio titulo="Nada por reponer" descripcion="Ningún producto está por debajo de su umbral." />
        ) : (
          <EstadoVacio
            titulo="Aún no hay inventario registrado"
            descripcion="El inventario aparece después de abrir el primer turno con productos activos."
          />
        )
      ) : (
        <TablaInventario filas={filas} />
      )}
    </>
  );
}
