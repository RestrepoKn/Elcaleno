import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getSupabasePool } from "@/lib/supabase-db";

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["admin", "user"]).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.values(value).some((field) => field !== undefined), { message: "Incluye al menos un campo para actualizar." });

type ExistingUser = { id: string; role: "admin" | "user"; active: boolean };
type ManagedUser = { id: string; name: string; email: string; role: "admin" | "user"; active: boolean; createdAt: string };
type Context = { params: Promise<{ id: string }> };

async function authorizationFailure() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  return null;
}

function databaseError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === "23505") return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  if (code === "22P02") return NextResponse.json({ error: "El identificador del usuario no es válido." }, { status: 400 });
  return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await authorizationFailure();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Los datos del usuario no son válidos." }, { status: 400 });

  const { id } = await params;
  const input = parsed.data;
  const pool = getSupabasePool();

  try {
    const existingResult = await pool.query<ExistingUser>(
      "select id::text, role, active from public.users where id = $1::uuid",
      [id],
    );
    const existing = existingResult.rows[0];
    if (!existing) return NextResponse.json({ error: "No se encontró el usuario." }, { status: 404 });

    const removesLastAdmin = existing.role === "admin" && existing.active &&
      ((input.role !== undefined && input.role !== "admin") || input.active === false);
    if (removesLastAdmin) {
      const admins = await pool.query<{ count: string }>("select count(*)::text as count from public.users where role = 'admin' and active = true");
      if (Number(admins.rows[0]?.count ?? 0) <= 1) {
        return NextResponse.json({ error: "Debe quedar al menos un administrador activo." }, { status: 409 });
      }
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;
    const result = await pool.query<ManagedUser>(
      `update public.users
       set name = coalesce($2, name),
           email = coalesce($3, email),
           role = coalesce($4, role),
           active = coalesce($5, active),
           password_hash = coalesce($6, password_hash),
           updated_at = now()
       where id = $1::uuid
       returning id::text, name, email, role, active, created_at::text as "createdAt"`,
      [id, input.name ?? null, input.email ?? null, input.role ?? null, input.active ?? null, passwordHash],
    );

    if (input.active === false || input.password) {
      await pool.query("delete from public.user_sessions where user_id = $1::uuid", [id]);
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    return databaseError(error);
  }
}