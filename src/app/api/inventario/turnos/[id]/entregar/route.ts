import { exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { entregarTurno } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

/** POST /api/inventario/turnos/[id]/entregar → TurnoDetalle (ambos roles). CU-07. */
export const POST = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  const usuario = await exigirSesion();
  const { id } = await params;
  return responderOk(await entregarTurno(id, usuario.rol));
});
