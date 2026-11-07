import Link from "next/link";
import { FormularioFactura } from "@/components/inventario/FormularioFactura";
import { SinPermiso } from "@/components/inventario/SinPermiso";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { listarFacturas, listarProductos, listarTurnos } from "@/lib/inventario/dataService";
import { hoyBogota } from "@/lib/reglas/fechas";

export const dynamic = "force-dynamic";

/** F6 · Facturas de compra y aviso de aumento de precio (opcional, solo administrador). */
export default async function PaginaFacturas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "administrador") return <SinPermiso />;

  const crudo = (await searchParams).productoId;
  const productoId = typeof crudo === "string" && crudo !== "" ? crudo : undefined;
  const [productos, turnos, facturas] = await Promise.all([
    listarProductos(),
    listarTurnos(20, usuario.rol),
    listarFacturas({ productoId }),
  ]);
  const opcionesProductos = productos.map((p) => ({
    valor: p.id,
    etiqueta: `${p.nombre} (${p.seccion === "bar" ? "bar" : "helados"})${p.activo ? "" : " · inactivo"}`,
  }));
  const opcionesTurnos = turnos.map((t) => ({ valor: t.id, etiqueta: `${t.nombre} · ${formatearFecha(t.fecha)}` }));
  const filtrado = productos.find((p) => p.id === productoId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-texto">Facturas de compra</h1>
        <p className="text-sm text-texto-suave">
          Historial de costos de proveedores, con aviso cuando un producto sube de precio. No son las facturas en
          efectivo del turno.
        </p>
      </div>

      <Tarjeta>
        <h2 className="mb-4 text-lg font-semibold text-texto">Registrar factura</h2>
        {productos.length === 0 ? (
          <EstadoVacio titulo="Primero registre productos" descripcion="Las facturas se asocian a un producto del catálogo." />
        ) : (
          <FormularioFactura fechaHoy={hoyBogota()} productos={opcionesProductos} turnos={opcionesTurnos} />
        )}
      </Tarjeta>

      <section className="flex flex-col gap-3" aria-labelledby="historial-facturas">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="historial-facturas" className="text-lg font-semibold text-texto">
            Historial{filtrado ? ` de ${filtrado.nombre}` : ""}
          </h2>
          <form method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-texto">
              Producto
              <select
                name="productoId"
                defaultValue={productoId ?? ""}
                className="min-h-11 rounded-lg border border-borde bg-superficie px-3 text-base text-texto focus-visible:outline-2 focus-visible:outline-primario"
              >
                <option value="">Todos</option>
                {opcionesProductos.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-borde bg-superficie px-4 text-sm font-semibold text-texto hover:bg-primario-suave focus-visible:outline-2 focus-visible:outline-primario"
            >
              Ver
            </button>
          </form>
        </div>

        {facturas.length === 0 ? (
          <EstadoVacio titulo="Sin facturas registradas" />
        ) : (
          <ul className="flex flex-col gap-2">
            {facturas.map((f) => (
              <li key={f.id} className={`flex flex-col gap-1 rounded-xl border bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between ${f.aumento ? "border-alerta-amarilla/60" : "border-borde"}`}>
                <div className="min-w-0">
                  <p className="font-medium text-texto">
                    <Link href={`/inventario/facturas?productoId=${f.productoId}`} className="underline-offset-4 hover:underline">
                      {f.producto}
                    </Link>{" "}
                    <span className="text-sm font-normal text-texto-suave">· Factura {f.numero} · {f.proveedor}</span>
                  </p>
                  <p className="text-sm text-texto-suave">{formatearFecha(f.fecha)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {f.aumento ? (
                    <Insignia tono="amarilla">
                      <span aria-hidden="true">↑</span> Subió {formatearPesos(f.aumento.diferencia)}
                    </Insignia>
                  ) : null}
                  <span className="text-lg font-semibold tabular-nums text-texto">{formatearPesos(f.valorUnitario)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
