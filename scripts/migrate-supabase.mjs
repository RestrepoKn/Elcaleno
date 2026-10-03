import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const connectionString = process.env.ELCALENOSM_POSTGRES_URL ?? process.env.ELCALENOSM_POSTGRES_PRISMA_URL;
if (!connectionString) {
  throw new Error("Configura ELCALENOSM_POSTGRES_URL en .env.local.");
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