// Borra los datos de prueba ("Prueba …") y de demostración ("Demo …") del inventario.
// Uso: npm run db:limpiar                   (prueba y demostración)
//      npm run db:limpiar -- --solo-prueba   (conserva la demostración)
//
// - Turnos cuyo nombre empieza por "Prueba" o "Demo" (sus filas se borran en cascada).
// - Productos "Prueba …" o "Demo …" sin filas en otros turnos; si aún tienen filas en un turno real, se desactivan.
// - Usuarios de demostración (@demo.elcaleno.test) del login y de acceso.
// Nunca toca turnos ni productos con otros nombres.

import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { borrarObjetos } from "../src/lib/db/almacenamiento.mjs";
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
    // Opcionales (M3), si ya existen: facturas de prueba (número "Prueba…" o de un producto de prueba) y cocina.
    const [m3] = (await cliente.query("select to_regclass('public.facturas') is not null as hay")).rows;
    let facturas = 0;
    let cocina = 0;
    if (m3?.hay) {
      const f = await cliente.query(
        `delete from facturas f using productos p
         where p.id = f.producto_id and (f.numero ~* $1 or p.nombre ~* $2)
         returning f.id`,
        [incluirDemo ? "^(prueba|demo)" : "^prueba", patronProducto],
      );
      facturas = f.rowCount ?? 0;
      const c = await cliente.query("delete from registros_cocina where producto ~* $1 returning id", [patronProducto]);
      cocina = c.rowCount ?? 0;
    }
    // Fotos de los turnos que se van a borrar (M4): los archivos de Storage no se borran en cascada.
    const [m4] = (await cliente.query("select to_regclass('public.fotos_turno') is not null as hay")).rows;
    const rutasFotos = m4?.hay
      ? (
          await cliente.query(
            "select f.ruta from fotos_turno f join turnos t on t.id = f.turno_id where t.nombre ~* $1",
            [patronTurno],
          )
        ).rows.map((r) => r.ruta)
      : [];
    const turnos = await cliente.query("delete from turnos where nombre ~* $1 returning id", [patronTurno]);
    if (rutasFotos.length > 0) {
      await borrarObjetos(rutasFotos).catch((e) => console.error(`No se pudieron borrar ${rutasFotos.length} fotos de Storage: ${e.message}`));
    }
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
      facturas,
      cocina,
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
    // npm run db:limpiar -- --solo-prueba  → conserva los datos de demostración.
    const r = await limpiarDatosDePrueba(cliente, { incluirDemo: !process.argv.includes("--solo-prueba") });
    console.log(
      `Limpieza: ${r.turnos} turnos, ${r.productosBorrados} productos borrados, ` +
        `${r.productosDesactivados} desactivados, ${r.usuarios} usuarios demo, ${r.facturas} facturas, ${r.cocina} registros de cocina.`,
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
