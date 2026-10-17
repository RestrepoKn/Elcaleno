function normalizarUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function urlSegura(host: string): string {
  const valor = host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `https://${valor}`;
}

export function obtenerUrlBase(): string {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return normalizarUrl(appUrl);

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && productionUrl) return urlSegura(productionUrl);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return urlSegura(vercelUrl);

  return "http://localhost:3000";
}
