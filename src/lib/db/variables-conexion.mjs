// Elige la cadena de conexión a Postgres según las variables disponibles.
// La usan la app (login e inventario) y los scripts de scripts/.
//
// Acepta tres nombres para cada variable, en este orden:
//   (sin prefijo) integración actual de Supabase en Vercel (desde 2026-11-07) y .env.local
//   ELCALENO_    por si la integración se reconecta con ese prefijo
//   ELCALENOSM_  integración anterior; su base quedó inaccesible, por eso va al final
//
// preferirSesion = true usa primero el session pooler (puerto 5432, *_URL_NON_POOLING):
// conviene para scripts y para `next dev`. En producción (Vercel, serverless) se usa primero
// el transaction pooler (puerto 6543, *_URL).

const PREFIJOS = ["", "ELCALENO_", "ELCALENOSM_"];
const AGRUPADA = ["POSTGRES_URL", "POSTGRES_PRISMA_URL"];
const SESION = ["POSTGRES_URL_NON_POOLING"];

/**
 * @param {string[]} nombres
 * @returns {{ nombre: string, valor: string } | null}
 */
function primeraDefinida(nombres) {
  for (const nombreBase of nombres) {
    for (const prefijo of PREFIJOS) {
      const nombre = prefijo + nombreBase;
      const valor = process.env[nombre];
      if (valor) return { nombre, valor };
    }
  }
  return null;
}

/**
 * @param {{ preferirSesion?: boolean }} [opciones]
 * @returns {{ nombre: string, valor: string } | null}
 */
export function urlConexionPostgres(opciones = {}) {
  const orden = opciones.preferirSesion ? [...SESION, ...AGRUPADA] : [...AGRUPADA, ...SESION];
  return primeraDefinida(orden);
}

let conexionRegistrada = false;

/**
 * Deja en el log (una vez por proceso) qué variable y qué proyecto de Supabase se usan.
 * Solo muestra el nombre de la variable, el ref del proyecto (público) y el puerto; nunca la cadena.
 * @param {{ nombre: string, valor: string }} conexion
 */
export function registrarConexionElegida(conexion) {
  if (conexionRegistrada) return;
  conexionRegistrada = true;
  try {
    const url = new URL(conexion.valor);
    const ref = decodeURIComponent(url.username).split(".")[1] ?? url.hostname.split(".")[0];
    console.info(`[db] conexión: ${conexion.nombre} · proyecto ${ref} · puerto ${url.port || "5432"}`);
  } catch {
    console.info(`[db] conexión: ${conexion.nombre} (URL con formato inválido)`);
  }
}

export const MENSAJE_FALTA_CONEXION =
  "Falta la conexión a Postgres: configura POSTGRES_URL (o ELCALENO_POSTGRES_URL) en .env.local.";
