import { FormularioProducto } from "@/components/inventario/FormularioProducto";
import { SinPermiso } from "@/components/inventario/SinPermiso";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { obtenerUsuario } from "@/lib/auth/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaNuevoProducto() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "administrador") return <SinPermiso />;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-texto">Nuevo producto</h1>
        <p className="text-sm text-texto-suave">
          Si hay un turno abierto, el producto entra en él con inicial 0.
        </p>
      </div>
      <Tarjeta>
        <FormularioProducto />
      </Tarjeta>
    </div>
  );
}
