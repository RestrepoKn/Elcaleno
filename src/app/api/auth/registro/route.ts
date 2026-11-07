import { NextResponse } from "next/server";
import { z } from "zod";
import { asignarAccesoInventario } from "@/lib/acceso-inventario";
import { createUserSession } from "@/lib/auth";
import { destinoTrasLogin } from "@/lib/auth/sesion";
import { hashPassword } from "@/lib/password";
import { getSupabasePool } from "@/lib/supabase-db";

// Registro público: el rol NO viene del cliente. Toda cuenta creada aquí es 'user' (nunca 'admin')
// y entra al inventario como encargado (pedido del estudiante). El administrador puede cambiar o quitar
// ese permiso en la pantalla Usuarios.
const registroSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const parsed = registroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Revisa el nombre, el correo y la contraseña (mínimo 8 caracteres)." },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    // La cuenta y su permiso de encargado se guardan juntos.
    const client = await getSupabasePool().connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into public.users (name, email, password_hash, role)
         values ($1, $2, $3, 'user')`,
        [name, email, passwordHash],
      );
      await asignarAccesoInventario(client, email, "encargado");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "23505") {
      return NextResponse.json({ success: false, error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }
    console.error("[registro] no se pudo crear la cuenta", error);
    return NextResponse.json({ success: false, error: "No se pudo crear la cuenta. Inténtalo de nuevo." }, { status: 500 });
  }

  // La cuenta ya existe: se inicia sesión con ella. Si eso fallara, la persona puede entrar desde el login.
  try {
    const user = await createUserSession(email, password);
    return NextResponse.json(
      { success: true, sesion: user !== null, destino: user ? await destinoTrasLogin(user.email) : "/login" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: true, sesion: false, destino: "/login" }, { status: 201 });
  }
}
