import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buscarTokenVigentePorHash,
  completarRestablecimiento,
} from "@/lib/dataService";
import { hashPassword } from "@/lib/password";
import { calcularHashToken } from "@/lib/tokenRecuperacion";

const esquemaRestablecimiento = z.object({
  token: z.string({ error: "El enlace no es válido o ya venció." })
    .regex(/^[a-f0-9]{64}$/i, "El enlace no es válido o ya venció."),
  contrasena: z.string({ error: "Ingresa una contraseña válida." })
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128, "La contraseña no puede superar 128 caracteres."),
  confirmacion: z.string({ error: "Confirma la nueva contraseña." }),
}).refine((valores) => valores.contrasena === valores.confirmacion, {
  path: ["confirmacion"],
  message: "La confirmación no coincide con la contraseña.",
});

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const validacion = esquemaRestablecimiento.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({
      error: validacion.error.issues[0]?.message ?? "Los datos ingresados no son válidos.",
    }, { status: 400 });
  }

  try {
    const token = await buscarTokenVigentePorHash(calcularHashToken(validacion.data.token.toLowerCase()));
    if (!token) {
      return NextResponse.json({ error: "El enlace no es válido o ya venció." }, { status: 400 });
    }

    const contrasenaHash = await hashPassword(validacion.data.contrasena);
    const restablecido = await completarRestablecimiento(token, contrasenaHash);
    if (!restablecido) {
      return NextResponse.json({ error: "El enlace no es válido o ya venció." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "La contraseña se restableció correctamente." });
  } catch {
    return NextResponse.json({ error: "No se pudo restablecer la contraseña. Inténtalo de nuevo." }, { status: 500 });
  }
}
