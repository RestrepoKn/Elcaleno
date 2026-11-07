import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { eliminarTurno, obtenerTurno } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** GET /api/inventario/turnos/[id] → TurnoDetalle (ambos roles; sin finanzas para el encargado). */
export const GET = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  const usuario = await exigirSesion();
  const { id } = await params;
  return responderOk(await obtenerTurno(id, usuario.rol));
});

/** DELETE /api/inventario/turnos/[id] → { eliminado, nombre, fecha, fotos } (solo administrador). */
export const DELETE = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  await exigirRol("administrador");
  const { id } = await params;
  return responderOk({ eliminado: true, ...(await eliminarTurno(id)) });
});
