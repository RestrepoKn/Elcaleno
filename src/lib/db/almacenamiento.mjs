// Acceso a Supabase Storage desde el servidor, por su API REST (sin dependencias nuevas).
// Usa la llave de servicio: nunca se importa desde componentes de cliente.
// La usan lib/datos/fotos.ts y scripts/limpiar-prueba.mjs.

export const ESPACIO_FOTOS = "facturas-turno";

const NOMBRES_URL = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_ELCALENOSUPABASE_URL", "ELCALENO_SUPABASE_URL"];
const NOMBRES_LLAVE = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "ELCALENO_SUPABASE_SERVICE_ROLE_KEY", "ELCALENO_SUPABASE_SECRET_KEY"];

function primera(nombres) {
  for (const nombre of nombres) {
    const valor = process.env[nombre];
    if (valor) return valor;
  }
  return null;
}

function configuracion() {
  const url = primera(NOMBRES_URL);
  const llave = primera(NOMBRES_LLAVE);
  if (!url || !llave) {
    throw new Error("Falta la configuración de Supabase Storage: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  }
  return {
    base: `${url.replace(/\/$/, "")}/storage/v1`,
    cabeceras: { apikey: llave, Authorization: `Bearer ${llave}` },
  };
}

/** Codifica cada segmento de la ruta del objeto. */
function rutaCodificada(ruta) {
  return ruta.split("/").map(encodeURIComponent).join("/");
}

/**
 * Sube un objeto al espacio de fotos. No reemplaza uno existente.
 * @param {string} ruta
 * @param {Uint8Array} bytes
 * @param {string} tipo
 */
export async function subirObjeto(ruta, bytes, tipo) {
  const { base, cabeceras } = configuracion();
  const r = await fetch(`${base}/object/${ESPACIO_FOTOS}/${rutaCodificada(ruta)}`, {
    method: "POST",
    headers: { ...cabeceras, "Content-Type": tipo, "x-upsert": "false", "Cache-Control": "max-age=3600" },
    body: bytes,
  });
  if (!r.ok) throw new Error(`Storage rechazó la subida (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

/**
 * Descarga un objeto del espacio de fotos.
 * @param {string} ruta
 * @returns {Promise<{ bytes: ArrayBuffer, tipo: string } | null>} null si no existe
 */
export async function descargarObjeto(ruta) {
  const { base, cabeceras } = configuracion();
  const r = await fetch(`${base}/object/authenticated/${ESPACIO_FOTOS}/${rutaCodificada(ruta)}`, { headers: cabeceras });
  if (r.status === 400 || r.status === 404) return null;
  if (!r.ok) throw new Error(`Storage rechazó la descarga (${r.status}).`);
  return { bytes: await r.arrayBuffer(), tipo: r.headers.get("content-type") ?? "application/octet-stream" };
}

/**
 * Borra varios objetos del espacio de fotos (los que no existan se ignoran).
 * @param {string[]} rutas
 */
export async function borrarObjetos(rutas) {
  if (rutas.length === 0) return;
  const { base, cabeceras } = configuracion();
  const r = await fetch(`${base}/object/${ESPACIO_FOTOS}`, {
    method: "DELETE",
    headers: { ...cabeceras, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: rutas }),
  });
  if (!r.ok) throw new Error(`Storage rechazó el borrado (${r.status}).`);
}
