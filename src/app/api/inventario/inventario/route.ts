import { exigirSesion } from "@/lib/auth/sesion";
import { leerConsulta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { inventarioActual } from "@/lib/inventario/dataService";
import { esquemaFiltrosInventario } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/inventario?seccion=&soloPorReponer= → FilaInventario[] (ambos roles). CU-11. */
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirSesion();
  const filtros = esquemaFiltrosInventario.parse(leerConsulta(request));
  return responderOk(await inventarioActual(filtros));
});
