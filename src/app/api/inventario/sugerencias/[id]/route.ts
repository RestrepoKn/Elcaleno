import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { eliminarSugerencia, marcarSugerencia } from "@/lib/inventario/dataService";
import { esquemaLecturaSugerencia } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** PATCH { leida } → Sugerencia (administrador). */
export const PATCH = conManejoDeErrores(async (request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  await exigirRol("administrador");
  const { id } = await params;
  const { leida } = await leerCuerpo(request, esquemaLecturaSugerencia);
  return responderOk(await marcarSugerencia(Number(id), leida));
});

/** DELETE → { eliminada: true } (administrador). */
export const DELETE = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  await exigirRol("administrador");
  const { id } = await params;
  await eliminarSugerencia(Number(id));
  return responderOk({ eliminada: true });
});
