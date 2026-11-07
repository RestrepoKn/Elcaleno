import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import { leerConsulta } from "@/lib/http/consulta";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { crearProducto, listarProductos } from "@/lib/inventario/dataService";
import { esquemaFiltrosProductos, esquemaProducto } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/productos?seccion=&soloActivos= → Producto[] (ambos roles). */
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  const filtros = esquemaFiltrosProductos.parse(leerConsulta(request));
  return responderOk(await listarProductos(filtros));
});

/** POST /api/inventario/productos → { id } (201, administrador). CU-01. */
export const POST = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  await exigirRol("administrador");
  const datos = await leerCuerpo(request, esquemaProducto);
  return responderOk(await crearProducto(datos), 201);
});
