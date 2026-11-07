import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { MENSAJE_FALTA_CONEXION, urlConexionPostgres } from "../src/lib/db/variables-conexion.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const connectionString = urlConexionPostgres({ preferirSesion: true })?.valor;
if (!connectionString) {
  throw new Error(MENSAJE_FALTA_CONEXION);
}

const databaseUrl = new URL(connectionString);
databaseUrl.searchParams.delete("sslmode");
databaseUrl.searchParams.delete("sslrootcert");
const pool = new Pool({ connectionString: databaseUrl.toString(), max: 1, ssl: { rejectUnauthorized: false } });
const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrations = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();

try {
  for (const file of migrations) {
    await pool.query(await readFile(new URL(file, migrationDirectory), "utf8"));
    console.log(`Migración aplicada: ${file}`);
  }
} finally {
  await pool.end();
}