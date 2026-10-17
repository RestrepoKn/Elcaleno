import { NextResponse } from "next/server";
import { z } from "zod";
import { enviarCorreo } from "@/lib/correo";
import {
  buscarUsuarioPorEmail,
  prepararSolicitudRecuperacion,
} from "@/lib/dataService";
import { plantillaRecuperacion } from "@/lib/plantillasCorreo";
import { calcularHashToken, generarToken } from "@/lib/tokenRecuperacion";
import { obtenerUrlBase } from "@/lib/urlBase";

const mensajeGenerico = "Si el correo está registrado, recibirás un enlace para restablecer la contraseña.";
const esquemaRecuperacion = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
});

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const validacion = esquemaRecuperacion.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
  }

  try {
    const usuario = await buscarUsuarioPorEmail(validacion.data.email);
    if (!usuario) return NextResponse.json({ message: mensajeGenerico });

    const token = generarToken();
    const preparado = await prepararSolicitudRecuperacion(usuario.id, calcularHashToken(token));
    if (!preparado) return NextResponse.json({ message: mensajeGenerico });

    const enlace = `${obtenerUrlBase()}/restablecer-contrasena?token=${token}`;
    await enviarCorreo({
      para: usuario.email,
      asunto: "Restablecer contraseña",
      html: plantillaRecuperacion(enlace),
    });

    return NextResponse.json({ message: mensajeGenerico });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la solicitud. Inténtalo de nuevo." }, { status: 500 });
  }
}
