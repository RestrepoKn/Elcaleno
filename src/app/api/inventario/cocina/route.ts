import { exigirSesion } from "@/lib/auth/sesion";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { listarCocina, registrarTurnoCocina } from "@/lib/inventario/dataService";
import { esquemaCocina } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/cocina?fecha= → RegistroCocina[] (ambos roles; opcional F5). */
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  const fecha = new URL(request.url).searchParams.get("fecha") ?? undefined;
  return responderOk(await listarCocina(fecha));
});

/** POST /api/inventario/cocina → RegistroCocina (201, ambos roles). CU-13. */
export const POST = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  const datos = await leerCuerpo(request, esquemaCocina);
  return responderOk(await registrarTurnoCocina(datos), 201);
});
