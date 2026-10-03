import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Ingresa un correo y una contraseña válidos." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Ingresa un correo y una contraseña válidos." }, { status: 400 });
  }

  try {
    const user = await createUserSession(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ success: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}