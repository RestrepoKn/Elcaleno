// Borra los datos de prueba ("Prueba …") y de demostración ("Demo …") del inventario.
// Uso: npm run db:limpiar
//
// - Turnos cuyo nombre empieza por "Prueba" o "Demo" (sus filas se borran en cascada).
// - Productos "Prueba …" o "Demo …" sin filas en otros turnos; si aún tienen filas en un turno real, se desactivan.
// - Usuarios de demostración (@demo.elcaleno.test) del login y de acceso.
// Nunca toca turnos ni productos con otros nombres.

import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { MENSAJE_FALTA_CONEXION, urlConexionPostgres } from "../src/lib/db/variables-conexion.mjs";

export const DOMINIO_DEMO = "@demo.elcaleno.test";

/**
 * @param {import("pg").PoolClient} cliente
 * @param {{ incluirDemo?: boolean }} [opciones]
 */
export async function limpiarDatosDePrueba(cliente, opciones = {}) {
  const incluirDemo = opciones.incluirDemo ?? true;
  const patronTurno = incluirDemo ? "^(prueba|demo)( |$)" : "^prueba( |$)";
  const patronProducto = incluirDemo ? "^(prueba|demo) " : "^prueba ";

  await cliente.query("BEGIN");
  try {
    const turnos = await cliente.query("delete from turnos where nombre ~* $1 returning id", [patronTurno]);
    const borrados = await cliente.query(
      `delete from productos p
       where p.nombre ~* $1
         and not exists (select 1 from registros_turno r where r.producto_id = p.id)
       returning id`,
      [patronProducto],
    );
    const desactivados = await cliente.query(
      "update productos set activo = false where nombre ~* $1 and activo returning id",
      [patronProducto],
    );
    let usuarios = 0;
    if (incluirDemo) {
      await cliente.query("delete from acceso where email like $1", [`%${DOMINIO_DEMO}`]);
      const u = await cliente.query("delete from users where email like $1 returning id", [`%${DOMINIO_DEMO}`]);
      usuarios = u.rowCount ?? 0;
    }
    await cliente.query("COMMIT");
    return {
      turnos: turnos.rowCount ?? 0,
      productosBorrados: borrados.rowCount ?? 0,
      productosDesactivados: desactivados.rowCount ?? 0,
      usuarios,
    };
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

/** Pool de una conexión para los scripts (puerto 5432 si está disponible). */
export function crearPoolScripts() {
  const conexion = urlConexionPostgres({ preferirSesion: true });
  if (!conexion) throw new Error(MENSAJE_FALTA_CONEXION);
  const url = new URL(conexion.valor);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  return new pg.Pool({
    connectionString: url.toString(),
    max: 1,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
}

async function principal() {
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const pool = crearPoolScripts();
  const cliente = await pool.connect();
  try {
    const r = await limpiarDatosDePrueba(cliente, { incluirDemo: true });
    console.log(
      `Limpieza: ${r.turnos} turnos, ${r.productosBorrados} productos borrados, ` +
        `${r.productosDesactivados} desactivados, ${r.usuarios} usuarios demo.`,
    );
  } finally {
    cliente.release();
    await pool.end();
  }
}

// Solo se ejecuta al llamar el archivo directamente (cargar-demo y probar-flujo lo importan).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((error) => {
    console.error(`No se pudo limpiar: ${error.code ?? ""} ${error.message}`);
    process.exitCode = 1;
  });
}
