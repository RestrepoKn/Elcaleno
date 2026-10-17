import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSupabasePool } from "@/lib/supabase-db";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "La nueva contraseña debe tener entre 8 y 128 caracteres." }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "La nueva contraseña debe ser distinta a la actual." }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

    const pool = getSupabasePool();
    const currentResult = await pool.query<{ passwordHash: string }>(
      "select password_hash as \"passwordHash\" from public.users where id = $1::uuid and active = true",
      [user.id],
    );
    const currentUser = currentResult.rows[0];
    if (!currentUser) return NextResponse.json({ error: "No se encontró una cuenta activa." }, { status: 404 });
    if (!(await verifyPassword(currentPassword, currentUser.passwordHash))) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);
    const updateResult = await pool.query(
      `update public.users
       set password_hash = $2, updated_at = now()
       where id = $1::uuid and password_hash = $3`,
      [user.id, newPasswordHash, currentUser.passwordHash],
    );
    if (updateResult.rowCount !== 1) {
      return NextResponse.json({ error: "La contraseña cambió durante la solicitud. Vuelve a intentarlo." }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Tu contraseña se cambió correctamente." });
  } catch {
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 500 });
  }
}
