import "server-only";
import type { Pool, PoolClient } from "pg";

// Permiso de una cuenta en el inventario (tabla acceso), para el registro y la pantalla de Usuarios.
export const ACCESOS_INVENTARIO = ["ninguno", "encargado", "administrador"] as const;
export type AccesoInventario = (typeof ACCESOS_INVENTARIO)[number];

type Db = Pool | PoolClient;

/** Asigna, cambia o quita (ninguno) el permiso del correo en el inventario. */
export async function asignarAccesoInventario(db: Db, email: string, acceso: AccesoInventario): Promise<void> {
  if (acceso === "ninguno") {
    await db.query("delete from acceso where lower(btrim(email)) = lower(btrim($1))", [email]);
    return;
  }
  await db.query(
    `insert into acceso (email, rol) values (lower(btrim($1)), $2)
     on conflict (email) do update set rol = excluded.rol`,
    [email, acceso],
  );
}

/** Si cambia el correo de la cuenta, el permiso del inventario se mueve con ella. */
export async function moverAccesoInventario(db: Db, emailAnterior: string, emailNuevo: string): Promise<void> {
  if (emailAnterior.toLowerCase() === emailNuevo.toLowerCase()) return;
  await db.query("update acceso set email = lower(btrim($2)) where lower(btrim(email)) = lower(btrim($1))", [
    emailAnterior,
    emailNuevo,
  ]);
}

/** true si el correo es hoy el único administrador del inventario. */
export async function esUltimoAdministradorInventario(db: Db, email: string): Promise<boolean> {
  const r = await db.query<{ propio: boolean; total: number }>(
    `select bool_or(lower(btrim(email)) = lower(btrim($1))) as propio, count(*)::int as total
     from acceso where rol = 'administrador'`,
    [email],
  );
  const fila = r.rows[0];
  return Boolean(fila?.propio) && (fila?.total ?? 0) <= 1;
}
