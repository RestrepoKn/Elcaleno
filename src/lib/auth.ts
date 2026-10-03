import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authSessionRecordSchema, type AuthSessionRecord, type UserRecord } from "@data/_schema/auth.schema";
import { create, query, remove } from "@/lib/json-db";

const sessionCookieName = "elcaleno_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user: UserRecord) {
  return { id: user.id, email: user.email, name: user.name };
}

export async function createUserSession(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await query<UserRecord>("users", (record) => record.email === normalizedEmail);
  if (!user || !user.active) return null;

  const { verifyPassword } = await import("@/lib/password");
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000).toISOString();
  await create(
    "sessions",
    { userId: user.id, tokenHash: hashToken(token), expiresAt },
    authSessionRecordSchema,
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

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const [session] = await query<AuthSessionRecord>("sessions", (record) => record.tokenHash === tokenHash);
  if (!session) return null;

  if (Date.parse(session.expiresAt) <= Date.now()) {
    await remove("sessions", session.id);
    return null;
  }

  const [user] = await query<UserRecord>("users", (record) => record.id === session.userId && record.active);
  return user ? publicUser(user) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function deleteUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    const [session] = await query<AuthSessionRecord>("sessions", (record) => record.tokenHash === tokenHash);
    if (session) await remove("sessions", session.id);
  }
  cookieStore.delete(sessionCookieName);
}