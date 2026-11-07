// Sesión y roles del inventario (plan, sección 4; RN-15).
// Envuelve el login existente (getCurrentUser de @/lib/auth) sin modificarlo y agrega el rol de la tabla acceso.

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { rolDeCorreo } from "@/lib/datos/acceso";
import type { Rol } from "@/lib/datos/tipos";
import { ErrorDeNegocio } from "@/lib/reglas/errores";

export type UsuarioInventario = { email: string; rol: Rol };

/** Correo (en minúsculas) del usuario con sesión iniciada, o null. */
export async function obtenerSesion(): Promise<string | null> {
  const usuario = await getCurrentUser();
  return usuario ? usuario.email.trim().toLowerCase() : null;
}

/** Usuario con su rol; null si no hay sesión o si el correo no está en acceso. Se calcula una vez por petición. */
export const obtenerUsuario = cache(async function obtenerUsuario(): Promise<UsuarioInventario | null> {
  const email = await obtenerSesion();
  if (!email) return null;
  const rol = await rolDeCorreo(email);
  return rol ? { email, rol } : null;
});

/** Lanza NO_AUTORIZADO si no hay sesión o el correo no tiene rol. */
export async function exigirSesion(): Promise<UsuarioInventario> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorDeNegocio("NO_AUTORIZADO");
  return usuario;
}

/** Lanza NO_AUTORIZADO sin sesión y SIN_PERMISO si el rol no alcanza. El administrador alcanza todo. */
export async function exigirRol(rol: Rol): Promise<UsuarioInventario> {
  const usuario = await exigirSesion();
  if (usuario.rol !== "administrador" && usuario.rol !== rol) {
    throw new ErrorDeNegocio("SIN_PERMISO");
  }
  return usuario;
}
