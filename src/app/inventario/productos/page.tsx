import Link from "next/link";
import { SinPermiso } from "@/components/inventario/SinPermiso";
import { TablaProductos } from "@/components/inventario/TablaProductos";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { listarProductos } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** Productos (solo administrador): CU-01 y CU-02. */
export default async function PaginaProductos() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "administrador") return <SinPermiso />;
  const productos = await listarProductos();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-texto">Productos</h1>
          <p className="text-sm text-texto-suave">Valores y umbrales de alerta. Un producto no se elimina: se desactiva.</p>
        </div>
        <Link
          href="/inventario/productos/nuevo"
          className="inline-flex min-h-11 items-center rounded-lg bg-primario px-4 text-sm font-semibold text-white hover:bg-primario-oscuro
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          Nuevo producto
        </Link>
      </div>
      {productos.length === 0 ? (
        <EstadoVacio titulo="No hay productos registrados" descripcion="Registre el catálogo del bar y de helados." />
      ) : (
        <TablaProductos productos={productos} />
      )}
    </>
  );
}
