import Link from "next/link";
import { EstadoVacio } from "@/components/ui/EstadoVacio";

export function SinPermiso({ descripcion }: { descripcion?: string }) {
  return (
    <EstadoVacio
      titulo="No tiene permiso para esta sección"
      descripcion={descripcion ?? "Esta sección es solo para el administrador."}
      accion={
        <Link href="/inventario" className="font-semibold text-primario underline-offset-4 hover:underline">
          Volver al inventario
        </Link>
      }
    />
  );
}
