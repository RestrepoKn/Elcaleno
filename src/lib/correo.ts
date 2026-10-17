import "server-only";
import { getToken } from "@vercel/connect";
import { Resend } from "resend";

type Correo = { para: string; asunto: string; html: string };
type ResultadoCorreo = { ok: true; id: string } | { ok: false; error: string };

export async function obtenerClaveResend(): Promise<string> {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  return getToken("resend/elcaleno", { subject: { type: "app" } });
}

export async function enviarCorreo({ para, asunto, html }: Correo): Promise<ResultadoCorreo> {
  try {
    const clave = await obtenerClaveResend();
    const resend = new Resend(clave);
    const resultado = await resend.emails.send({
      from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
      to: para,
      subject: asunto,
      html,
    });

    if (resultado.error) return { ok: false, error: resultado.error.message };
    if (!resultado.data?.id) return { ok: false, error: "Resend no confirmó el envío del correo." };
    return { ok: true, id: resultado.data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo enviar el correo.",
    };
  }
}
