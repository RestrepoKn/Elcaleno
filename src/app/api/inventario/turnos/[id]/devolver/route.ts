import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { devolverTurno } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** POST /api/inventario/turnos/[id]/devolver → TurnoDetalle (administrador). CU-10. */
export const POST = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  const usuario = await exigirRol("administrador");
  const { id } = await params;
  return responderOk(await devolverTurno(id, usuario.rol));
});
