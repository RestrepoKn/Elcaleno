import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const archivoTemporal = ".env.vercel.local";
const archivoLocal = ".env.local";
const aviso = "Aviso: no se pudo renovar la conexión con Vercel. El envío de correos no funcionará en local.";

try {
  execSync("npx vercel env pull .env.vercel.local --yes", { stdio: "ignore", windowsHide: true });

  const contenidoVercel = readFileSync(archivoTemporal, "utf8");
  const lineaToken = contenidoVercel
    .split(/\r?\n/)
    .find((linea) => /^VERCEL_OIDC_TOKEN=.+$/.test(linea));
  if (!lineaToken) throw new Error("No se encontró el token de Vercel.");

  const contenidoLocal = readFileSync(archivoLocal, "utf8");
  const lineasLocales = contenidoLocal.split(/\r?\n/);
  const indiceToken = lineasLocales.findIndex((linea) => /^VERCEL_OIDC_TOKEN=/.test(linea));

  if (indiceToken === -1) {
    if (contenidoLocal.length === 0) {
      lineasLocales[0] = lineaToken;
    } else if (contenidoLocal.endsWith("\n") || contenidoLocal.endsWith("\r")) {
      lineasLocales.splice(lineasLocales.length - 1, 0, lineaToken);
    } else {
      lineasLocales.push(lineaToken);
    }
  } else {
    lineasLocales[indiceToken] = lineaToken;
  }

  const salto = contenidoLocal.includes("\r\n") ? "\r\n" : "\n";
  writeFileSync(archivoLocal, lineasLocales.join(salto), "utf8");
} catch {
  process.exitCode = 0;
  console.warn(aviso);
} finally {
  try {
    if (existsSync(archivoTemporal)) unlinkSync(archivoTemporal);
  } catch {
    process.exitCode = 0;
    console.warn(aviso);
  }
}
