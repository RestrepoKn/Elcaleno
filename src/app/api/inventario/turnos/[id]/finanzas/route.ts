import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { registrarFinanzas } from "@/lib/inventario/dataService";
import { esquemaFinanzas } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** PUT /api/inventario/turnos/[id]/finanzas → TurnoDetalle (administrador). CU-08. */
export const PUT = conManejoDeErrores(async (request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  const usuario = await exigirRol("administrador");
  const { id } = await params;
  const finanzas = await leerCuerpo(request, esquemaFinanzas);
  return responderOk(await registrarFinanzas(id, finanzas, usuario.rol));
});
