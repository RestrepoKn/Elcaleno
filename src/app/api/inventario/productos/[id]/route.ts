import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { actualizarProducto } from "@/lib/inventario/dataService";
import { esquemaCambiosProducto } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** PATCH /api/inventario/productos/[id] → { actualizado: true } (administrador). CU-02. */
export const PATCH = conManejoDeErrores(async (request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  await exigirRol("administrador");
  const { id } = await params;
  const cambios = await leerCuerpo(request, esquemaCambiosProducto);
  await actualizarProducto(id, cambios);
  return responderOk({ actualizado: true });
});
