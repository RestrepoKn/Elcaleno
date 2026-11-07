import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { listarFacturas, registrarFactura } from "@/lib/inventario/dataService";
import { esquemaFactura } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/facturas?productoId= → FacturaConAumento[] (administrador; opcional F6). */
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  await exigirRol("administrador");
  const productoId = new URL(request.url).searchParams.get("productoId") ?? undefined;
  return responderOk(await listarFacturas({ productoId }));
});

/** POST /api/inventario/facturas → FacturaConAumento (201, administrador). CU-14. */
export const POST = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  await exigirRol("administrador");
  const datos = await leerCuerpo(request, esquemaFactura);
  return responderOk(await registrarFactura(datos), 201);
});
