// Consulta del rol de un correo en la tabla acceso (RN-15).

import { consultar } from "@/lib/db/conexion";
import type { Rol } from "@/lib/datos/tipos";

/** Rol asignado al correo, o null si el correo no está en acceso. */
export async function rolDeCorreo(email: string): Promise<Rol | null> {
  const filas = await consultar<{ rol: Rol }>(
    `select rol
     from acceso
     where lower(btrim(email)) = lower(btrim($1))
     limit 1`,
    [email],
  );
  return filas[0]?.rol ?? null;
}
