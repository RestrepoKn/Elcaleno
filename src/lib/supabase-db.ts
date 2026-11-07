import "server-only";
import { Pool } from "pg";
import {
  MENSAJE_FALTA_CONEXION,
  registrarConexionElegida,
  urlConexionPostgres,
} from "@/lib/db/variables-conexion.mjs";

const globalForPostgres = globalThis as typeof globalThis & { __elcalenoSupabasePool?: Pool };

export function getSupabasePool(): Pool {
  if (globalForPostgres.__elcalenoSupabasePool) return globalForPostgres.__elcalenoSupabasePool;

  const conexion = urlConexionPostgres({ preferirSesion: process.env.NODE_ENV !== "production" });
  if (!conexion) throw new Error(MENSAJE_FALTA_CONEXION);
  registrarConexionElegida(conexion);
  const connectionString = conexion.valor;

  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("sslrootcert");
  const pool = new Pool({ connectionString: databaseUrl.toString(), max: 5, ssl: { rejectUnauthorized: false } });
  globalForPostgres.__elcalenoSupabasePool = pool;
  return pool;
}