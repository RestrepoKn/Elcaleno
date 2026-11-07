// Crea (o actualiza) un usuario del login y le asigna su rol en el inventario.
// Uso: npm run db:usuario
// Pide correo, nombre, rol y contraseña (oculta). Requiere haber ejecutado npm run db:migrate.
//
// - public.users: login existente (rol 'admin' para administradores, 'user' para encargados).
// - public.acceso: rol del inventario ('administrador' | 'encargado').
// El hash usa el mismo formato que src/lib/password.ts: scrypt$<sal hex 16 bytes>$<clave hex 64 bytes>.

import nextEnv from "@next/env";
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";
import { Pool } from "pg";
import { MENSAJE_FALTA_CONEXION, urlConexionPostgres } from "../src/lib/db/variables-conexion.mjs";

nextEnv.loadEnvConfig(process.cwd());

function preguntar(texto, { oculto = false } = {}) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      rl._writeToOutput = (cadena) => {
        if (cadena.startsWith(texto)) rl.output.write(texto);
        else if (cadena.includes("\n") || cadena.includes("\r")) rl.output.write("\n");
      };
    }
    rl.question(texto, (respuesta) => {
      rl.close();
      resolver(respuesta);
    });
  });
}

function hashContrasena(contrasena) {
  return new Promise((resolver, rechazar) => {
    const sal = randomBytes(16);
    scrypt(contrasena, sal, 64, (error, clave) => {
      if (error) rechazar(error);
      else resolver(`scrypt$${sal.toString("hex")}$${clave.toString("hex")}`);
    });
  });
}

const cadena = urlConexionPostgres({ preferirSesion: true })?.valor;
if (!cadena) {
  console.error(MENSAJE_FALTA_CONEXION);
  process.exit(1);
}

// Modo sin preguntas: --email <correo> --nombre <nombre> --rol <rol> --generar-contrasena
// Genera una contraseña aleatoria y la imprime UNA vez al final.
const argumentos = process.argv.slice(2);
const argumento = (nombre) => {
  const i = argumentos.indexOf(nombre);
  return i >= 0 ? argumentos[i + 1] : undefined;
};
const generar = argumentos.includes("--generar-contrasena");

const email = (argumento("--email") ?? (await preguntar("Correo: "))).trim().toLowerCase();
const nombre = (argumento("--nombre") ?? (await preguntar("Nombre: "))).trim();
const rolTexto = (argumento("--rol") ?? (await preguntar("Rol (administrador / encargado): ")))
  .trim()
  .toLowerCase();
const contrasena = generar
  ? randomBytes(12).toString("base64url")
  : await preguntar("Contraseña (mínimo 8, no se verá): ", { oculto: true });
const confirmacion = generar ? contrasena : await preguntar("Repita la contraseña: ", { oculto: true });

const errores = [];
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) errores.push("correo inválido");
if (nombre.length < 1 || nombre.length > 120) errores.push("nombre vacío o muy largo");
if (rolTexto !== "administrador" && rolTexto !== "encargado") errores.push("rol inválido");
if (contrasena.length < 8 || contrasena.length > 128) errores.push("la contraseña debe tener entre 8 y 128 caracteres");
if (contrasena !== confirmacion) errores.push("las contraseñas no coinciden");
if (errores.length > 0) {
  console.error(`No se creó el usuario: ${errores.join("; ")}.`);
  process.exit(1);
}

const url = new URL(cadena);
url.searchParams.delete("sslmode");
url.searchParams.delete("sslrootcert");
const pool = new Pool({
  connectionString: url.toString(),
  max: 1,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

const cliente = await pool.connect().catch((error) => {
  console.error(`No se pudo conectar a la base: ${error.code ?? ""} ${error.message}`);
  process.exit(1);
});

try {
  const hash = await hashContrasena(contrasena);
  const rolLogin = rolTexto === "administrador" ? "admin" : "user";
  await cliente.query("BEGIN");
  await cliente.query(
    `insert into public.users (email, name, password_hash, role, active)
     values ($1, $2, $3, $4, true)
     on conflict (email) do update
       set name = excluded.name, password_hash = excluded.password_hash,
           role = excluded.role, active = true, updated_at = now()`,
    [email, nombre, hash, rolLogin],
  );
  await cliente.query(
    `insert into public.acceso (email, rol) values ($1, $2)
     on conflict (email) do update set rol = excluded.rol`,
    [email, rolTexto],
  );
  await cliente.query("COMMIT");
  console.log(`Listo: ${email} puede iniciar sesión con rol ${rolTexto}.`);
  if (generar) console.log(`Contraseña generada (guárdela; no se vuelve a mostrar): ${contrasena}`);
} catch (error) {
  await cliente.query("ROLLBACK").catch(() => {});
  console.error(`No se creó el usuario: ${error.code ?? ""} ${error.message}`);
  if (error.code === "42P01") console.error("Falta alguna tabla: ejecute primero npm run db:migrate.");
  process.exitCode = 1;
} finally {
  cliente.release();
  await pool.end();
}
