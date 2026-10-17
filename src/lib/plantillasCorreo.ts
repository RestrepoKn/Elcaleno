function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function plantillaRecuperacion(enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  return `
    <div style="margin:0;padding:32px;background-color:#09111f;color:#f4f7fb;font-family:Arial,sans-serif">
      <div style="max-width:520px;margin:0 auto;padding:32px;border:1px solid #263244;background-color:#0f172a">
        <p style="margin:0 0 16px;color:#67e8f9;font-size:12px;letter-spacing:3px">ELCALEÑO / SEGURIDAD</p>
        <h1 style="margin:0 0 16px;font-size:26px">Restablecer contraseña</h1>
        <p style="margin:0 0 24px;color:#cbd5e1;line-height:1.6">Usa el siguiente botón para elegir una nueva contraseña. Este enlace vence en 30 minutos.</p>
        <a href="${enlaceSeguro}" style="display:inline-block;padding:12px 20px;background-color:#fcd34d;color:#0f172a;font-weight:bold;text-decoration:none">Restablecer contraseña</a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo válida.</p>
      </div>
    </div>
  `;
}
