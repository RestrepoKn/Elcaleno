import { exigirRol, exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, leerCuerpo, responderOk } from "@/lib/http/respuestas";
import { actualizarRegistro } from "@/lib/inventario/dataService";
import { esquemaCambioRegistro } from "@/lib/validacion/esquemas";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/inventario/turnos/[id]/registros/[registroId] → RegistroTurno.
 * Ambos roles registran entrada, vendida y contado (CU-04, CU-05); el inicial solo el administrador (CU-06, RN-09).
 */
export const PATCH = conManejoDeErrores(
  async (request: Request, { params }: ContextoRuta<{ id: string; registroId: string }>) => {
    await exigirSesion();
    const { id, registroId } = await params;
    const cambios = await leerCuerpo(request, esquemaCambioRegistro);
    if (cambios.inicial !== undefined) await exigirRol("administrador");
    return responderOk(await actualizarRegistro(id, Number(registroId), cambios));
  },
);
