// Conexión a Postgres del módulo de inventario (plan, sección 10.7, con los ajustes de Doc/DICTAMEN.md).
// Solo lib/datos/ importa este archivo. No usa "server-only" para que los scripts con tsx puedan importarlo.
// Los parsers de tipos se aplican solo a este pool: no cambian las consultas de otros módulos.

import { Pool, types, type CustomTypesConfig, type PoolClient, type QueryResultRow } from "pg";
import {
  MENSAJE_FALTA_CONEXION,
  registrarConexionElegida,
  urlConexionPostgres,
} from "@/lib/db/variables-conexion.mjs";

const OID_DATE = 1082;
const OID_TIMESTAMP = 1114;
const OID_TIMESTAMPTZ = 1184;
const OID_BIGINT = 20;

const comoTexto = (valor: string) => valor;
const comoEntero = (valor: string) => parseInt(valor, 10);

/** Fechas y marcas de tiempo como texto; BIGINT (ids, COUNT, SUM) como número; el resto, por defecto. */
export const tiposInventario: CustomTypesConfig = {
  getTypeParser: ((id: number, formato?: "text" | "binary") => {
    if (formato !== "binary") {
      if (id === OID_DATE || id === OID_TIMESTAMP || id === OID_TIMESTAMPTZ) return comoTexto;
      if (id === OID_BIGINT) return comoEntero;
    }
    return types.getTypeParser(id, formato);
  }) as CustomTypesConfig["getTypeParser"],
};

/** Quita sslmode y sslrootcert: con ellos pg ignora ssl.rejectUnauthorized y falla el certificado. */
export function limpiarUrlConexion(cadena: string): string {
  const url = new URL(cadena);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  return url.toString();
}

const globalParaPool = globalThis as typeof globalThis & { __poolInventario?: Pool };

/** Crea el pool la primera vez que se usa (no al importar, para que el build no exija la variable). */
function obtenerPool(): Pool {
  if (globalParaPool.__poolInventario) return globalParaPool.__poolInventario;

  const conexion = urlConexionPostgres({ preferirSesion: process.env.NODE_ENV !== "production" });
  if (!conexion) throw new Error(MENSAJE_FALTA_CONEXION);
  registrarConexionElegida(conexion);

  const pool = new Pool({
    connectionString: limpiarUrlConexion(conexion.valor),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    types: tiposInventario,
  });
  globalParaPool.__poolInventario = pool;
  return pool;
}

/** Ejecuta una consulta parametrizada y devuelve sus filas. */
export async function consultar<T extends QueryResultRow>(
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const resultado = await obtenerPool().query<T>(sql, valores);
  return resultado.rows;
}

/** Ejecuta el trabajo dentro de una transacción: COMMIT si termina bien, ROLLBACK si lanza. */
export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    try {
      await cliente.query("ROLLBACK");
    } catch {
      // Si la conexión se cayó, el ROLLBACK también falla; se conserva el error original.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

/** Cierra el pool; para scripts que terminan el proceso. */
export async function cerrarConexion(): Promise<void> {
  const pool = globalParaPool.__poolInventario;
  if (!pool) return;
  delete globalParaPool.__poolInventario;
  await pool.end();
}
