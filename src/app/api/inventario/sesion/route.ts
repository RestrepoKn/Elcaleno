import { exigirSesion } from "@/lib/auth/sesion";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";

export const dynamic = "force-dynamic";

/** GET /api/inventario/sesion → { email, rol } del usuario con sesión. */
export const GET = conManejoDeErrores(async () => {
  const usuario = await exigirSesion();
  return responderOk({ email: usuario.email, rol: usuario.rol });
});
