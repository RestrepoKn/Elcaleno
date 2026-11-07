import { SinPermiso } from "@/components/inventario/SinPermiso";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { obtenerUsuario } from "@/lib/auth/sesion";

export const dynamic = "force-dynamic";

// Marcador de P06: el historial y el resumen financiero se construyen en P08.
export default async function PaginaHistorial() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "administrador") return <SinPermiso />;
  return (
    <EstadoVacio
      titulo="Historial de turnos"
      descripcion="Próximamente: venta total, faltantes y resultado neto por turno."
    />
  );
}
