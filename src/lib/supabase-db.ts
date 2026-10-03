import "server-only";
import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & { __elcalenoSupabasePool?: Pool };

export function getSupabasePool(): Pool {
  if (globalForPostgres.__elcalenoSupabasePool) return globalForPostgres.__elcalenoSupabasePool;

  const connectionString = process.env.ELCALENOSM_POSTGRES_URL ?? process.env.ELCALENOSM_POSTGRES_PRISMA_URL;
  if (!connectionString) throw new Error("Falta ELCALENOSM_POSTGRES_URL para conectar con Supabase.");

  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("sslrootcert");
  const pool = new Pool({ connectionString: databaseUrl.toString(), max: 5, ssl: { rejectUnauthorized: false } });
  globalForPostgres.__elcalenoSupabasePool = pool;
  return pool;
}