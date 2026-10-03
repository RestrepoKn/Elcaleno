import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getSupabasePool } from "@/lib/supabase-db";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "user"]).default("user"),
});

type ManagedUser = { id: string; name: string; email: string; role: "admin" | "user"; active: boolean; createdAt: string };

async function authorizationFailure() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  return null;
}

function databaseError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === "23505") return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  return NextResponse.json({ error: "No se pudo completar la operación de usuarios." }, { status: 500 });
}

export async function GET() {
  const denied = await authorizationFailure();
  if (denied) return denied;

  try {
    const result = await getSupabasePool().query<ManagedUser>(
      `select id::text, name, email, role, active, created_at::text as "createdAt"
       from public.users
       order by created_at desc`,
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const denied = await authorizationFailure();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revisa nombre, correo, rol y contraseña (mínimo 8 caracteres)." }, { status: 400 });

  try {
    const { name, email, password, role } = parsed.data;
    const passwordHash = await hashPassword(password);
    const result = await getSupabasePool().query<ManagedUser>(
      `insert into public.users (name, email, password_hash, role)
       values ($1, $2, $3, $4)
       returning id::text, name, email, role, active, created_at::text as "createdAt"`,
      [name, email, passwordHash, role],
    );
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}