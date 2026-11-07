import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { cerrarTurno } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** POST /api/inventario/turnos/[id]/cerrar → TurnoDetalle (administrador). CU-09. */
export const POST = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  const usuario = await exigirRol("administrador");
  const { id } = await params;
  return responderOk(await cerrarTurno(id, usuario.rol));
});
