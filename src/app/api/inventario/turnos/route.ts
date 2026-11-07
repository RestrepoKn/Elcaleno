import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import { LIMITE_LISTADO } from "@/lib/config/inventario";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { abrirTurno, listarTurnos } from "@/lib/inventario/dataService";
import { esquemaTurno } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/turnos?limite= → TurnoResumen[] (administrador). CU-12. */
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  const usuario = await exigirRol("administrador");
  const limite = Number(new URL(request.url).searchParams.get("limite") ?? LIMITE_LISTADO);
  return responderOk(await listarTurnos(limite, usuario.rol));
});

/** POST /api/inventario/turnos → TurnoDetalle (201, ambos roles). CU-03. */
export const POST = conManejoDeErrores(async (request: Request) => {
  const usuario = await exigirSesion();
  const datos = await leerCuerpo(request, esquemaTurno);
  return responderOk(await abrirTurno(datos, usuario.rol), 201);
});
