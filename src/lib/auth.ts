import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { verifyPassword } from "@/lib/password";
import { getSupabasePool } from "@/lib/supabase-db";

type UserRecord = { id: string; email: string; name: string; role: "admin" | "user"; passwordHash: string };
type CurrentUser = { id: string; email: string; name: string; role: "admin" | "user" };

const sessionCookieName = "elcaleno_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user: UserRecord): CurrentUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function createUserSession(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const pool = getSupabasePool();
  const result = await pool.query<UserRecord>(
    `select id::text, email, name, role, password_hash as "passwordHash"
     from public.users
     where email = $1 and active = true
     limit 1`,
    [normalizedEmail],
  );
  const user = result.rows[0];
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000).toISOString();
  await pool.query(
    "insert into public.user_sessions (user_id, token_hash, expires_at) values ($1, $2, $3)",
    [user.id, hashToken(token), expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });

  return publicUser(user);
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const pool = getSupabasePool();
  const result = await pool.query<CurrentUser>(
    `select u.id::text, u.email, u.name, u.role
     from public.user_sessions s
     join public.users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now() and u.active = true
     limit 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function deleteUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await getSupabasePool().query("delete from public.user_sessions where token_hash = $1", [hashToken(token)]);
  }
  cookieStore.delete(sessionCookieName);
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}