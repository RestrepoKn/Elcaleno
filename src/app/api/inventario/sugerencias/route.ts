import { exigirSesion } from "@/lib/auth/sesion";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { crearSugerencia, listarMisSugerencias, listarSugerencias } from "@/lib/inventario/dataService";
import { esquemaSugerencia } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET → el administrador recibe todas (?soloNoLeidas=true); el encargado, solo las suyas. */
export const GET = conManejoDeErrores(async (request: Request) => {
  const usuario = await exigirSesion();
  if (usuario.rol !== "administrador") return responderOk(await listarMisSugerencias(usuario.email));
  const soloNoLeidas = new URL(request.url).searchParams.get("soloNoLeidas") === "true";
  return responderOk(await listarSugerencias({ soloNoLeidas }));
});

/** POST { categoria, mensaje } → Sugerencia (201, ambos roles). */
export const POST = conManejoDeErrores(async (request: Request) => {
  const usuario = await exigirSesion();
  const datos = await leerCuerpo(request, esquemaSugerencia);
  return responderOk(await crearSugerencia(usuario.email, datos), 201);
});
