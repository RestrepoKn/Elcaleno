import "server-only";
import type { PoolClient } from "pg";
import { getSupabasePool } from "@/lib/supabase-db";

export type UsuarioRecuperacion = { id: string; email: string };
export type TokenRecuperacion = { id: string; usuarioId: string };

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioRecuperacion | null> {
  const result = await getSupabasePool().query<UsuarioRecuperacion>(
    `select id::text, email
     from public.users
     where email = $1 and active = true
     limit 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function contarSolicitudesRecuperacion(usuarioId: string): Promise<number> {
  const result = await getSupabasePool().query<{ total: string }>(
    `select count(*)::text as total
     from public.restablecimientos_contrasena
     where usuario_id = $1::uuid
       and creado_en >= now() - interval '15 minutes'`,
    [usuarioId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

export async function invalidarTokensPendientes(usuarioId: string): Promise<void> {
  await getSupabasePool().query(
    `update public.restablecimientos_contrasena
     set usado_en = now()
     where usuario_id = $1::uuid and usado_en is null and expira_en > now()`,
    [usuarioId],
  );
}

export async function crearTokenRecuperacion(usuarioId: string, tokenHash: string): Promise<void> {
  await getSupabasePool().query(
    `insert into public.restablecimientos_contrasena (usuario_id, token_hash, expira_en)
     values ($1::uuid, $2, now() + interval '30 minutes')`,
    [usuarioId, tokenHash],
  );
}

export async function prepararSolicitudRecuperacion(usuarioId: string, tokenHash: string): Promise<boolean> {
  const client = await getSupabasePool().connect();

  try {
    await client.query("begin");
    const usuario = await client.query(
      "select id from public.users where id = $1::uuid and active = true for update",
      [usuarioId],
    );
    if (usuario.rowCount !== 1) {
      await client.query("rollback");
      return false;
    }

    const solicitudes = await client.query<{ total: number }>(
      `select count(*)::int as total
       from public.restablecimientos_contrasena
       where usuario_id = $1::uuid
         and creado_en >= now() - interval '15 minutes'`,
      [usuarioId],
    );
    if ((solicitudes.rows[0]?.total ?? 0) >= 3) {
      await client.query("rollback");
      return false;
    }

    await client.query(
      `update public.restablecimientos_contrasena
       set usado_en = now()
       where usuario_id = $1::uuid and usado_en is null and expira_en > now()`,
      [usuarioId],
    );
    await client.query(
      `insert into public.restablecimientos_contrasena (usuario_id, token_hash, expira_en)
       values ($1::uuid, $2, now() + interval '30 minutes')`,
      [usuarioId, tokenHash],
    );
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function buscarTokenVigentePorHash(tokenHash: string): Promise<TokenRecuperacion | null> {
  const result = await getSupabasePool().query<TokenRecuperacion>(
    `select r.id::text, r.usuario_id::text as "usuarioId"
     from public.restablecimientos_contrasena r
     join public.users u on u.id = r.usuario_id
     where r.token_hash = $1
       and r.usado_en is null
       and r.expira_en > now()
       and u.active = true
     limit 1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function marcarTokenComoUsado(tokenId: string): Promise<boolean> {
  const result = await getSupabasePool().query(
    `update public.restablecimientos_contrasena
     set usado_en = now()
     where id = $1::uuid and usado_en is null and expira_en > now()
     returning id`,
    [tokenId],
  );
  return result.rowCount === 1;
}

export async function actualizarContrasena(usuarioId: string, contrasenaHash: string): Promise<void> {
  await getSupabasePool().query(
    `update public.users
     set password_hash = $2, updated_at = now()
     where id = $1::uuid and active = true`,
    [usuarioId, contrasenaHash],
  );
}

export async function completarRestablecimiento(
  token: TokenRecuperacion,
  contrasenaHash: string,
): Promise<boolean> {
  const pool = getSupabasePool();
  const client: PoolClient = await pool.connect();

  try {
    await client.query("begin");
    const validToken = await client.query(
      `select id
       from public.restablecimientos_contrasena
       where id = $1::uuid
         and usuario_id = $2::uuid
         and usado_en is null
         and expira_en > now()
       for update`,
      [token.id, token.usuarioId],
    );
    if (validToken.rowCount !== 1) {
      await client.query("rollback");
      return false;
    }

    const updatedUser = await client.query(
      `update public.users
       set password_hash = $2, updated_at = now()
       where id = $1::uuid and active = true`,
      [token.usuarioId, contrasenaHash],
    );
    if (updatedUser.rowCount !== 1) {
      await client.query("rollback");
      return false;
    }

    const usedToken = await client.query(
      `update public.restablecimientos_contrasena
       set usado_en = now()
       where id = $1::uuid and usado_en is null and expira_en > now()`,
      [token.id],
    );
    if (usedToken.rowCount !== 1) {
      await client.query("rollback");
      return false;
    }

    await client.query(
      `update public.restablecimientos_contrasena
       set usado_en = now()
       where usuario_id = $1::uuid and id <> $2::uuid and usado_en is null`,
      [token.usuarioId, token.id],
    );
    await client.query("delete from public.user_sessions where user_id = $1::uuid", [token.usuarioId]);
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
