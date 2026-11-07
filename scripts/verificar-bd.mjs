// Verifica la base de datos del inventario (P01, TAREA 4).
// Las pruebas de integridad corren en una sola transacción que SIEMPRE termina en ROLLBACK:
// no deja datos en la base.
//
// Uso: npm run db:verificar

import nextEnv from "@next/env";
import { Pool } from "pg";
import { MENSAJE_FALTA_CONEXION, urlConexionPostgres } from "../src/lib/db/variables-conexion.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

// El puerto 5432 (session pooler) responde desde esta red; el 6543 no siempre.
const cadena = urlConexionPostgres({ preferirSesion: true })?.valor;
if (!cadena) {
  console.error(MENSAJE_FALTA_CONEXION);
  process.exit(1);
}

const url = new URL(cadena);
url.searchParams.delete("sslmode");
url.searchParams.delete("sslrootcert");

const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 30000,
});

const TABLAS = ["acceso", "productos", "turnos", "registros_turno"];
const VISTAS = ["v_registros_turno", "v_turnos", "v_inventario_actual"];

let fallas = 0;

function ok(texto) {
  console.log(`  OK     ${texto}`);
}

function falla(texto) {
  fallas += 1;
  console.log(`  FALLA  ${texto}`);
}

function revisar(condicion, texto) {
  if (condicion) ok(texto);
  else falla(texto);
}

function titulo(texto) {
  console.log(`\n${texto}`);
}

/** Ejecuta un caso que debe funcionar. Devuelve las filas o null si falló. */
async function debeFuncionar(cliente, texto, sql, valores = []) {
  try {
    const resultado = await cliente.query(sql, valores);
    ok(texto);
    return resultado.rows;
  } catch (error) {
    falla(`${texto} (error inesperado ${error.code ?? ""} ${error.constraint ?? error.message})`);
    // La transacción queda abortada: no se puede seguir sin reiniciarla.
    throw error;
  }
}

/** Ejecuta un caso que debe fallar con un código y, si se indica, una restricción. */
async function debeFallar(cliente, texto, sql, valores, codigo, restriccion) {
  await cliente.query("SAVEPOINT caso");
  try {
    await cliente.query(sql, valores);
    falla(`${texto} (se esperaba ${codigo} ${restriccion ?? ""}, pero funcionó)`);
  } catch (error) {
    const codigoOk = error.code === codigo;
    const restriccionOk = !restriccion || error.constraint === restriccion;
    if (codigoOk && restriccionOk) {
      ok(`${texto} → ${error.code} ${error.constraint ?? ""}`);
    } else {
      falla(
        `${texto} (se esperaba ${codigo} ${restriccion ?? ""}; llegó ${error.code ?? "?"} ${error.constraint ?? error.message})`,
      );
    }
  } finally {
    await cliente.query("ROLLBACK TO SAVEPOINT caso");
  }
}

async function existencia(cliente) {
  titulo("1. Existencia de tablas y vistas");
  const { rows } = await cliente.query(
    `SELECT table_name, table_type
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [[...TABLAS, ...VISTAS]],
  );
  const tipos = new Map(rows.map((fila) => [fila.table_name, fila.table_type]));
  for (const tabla of TABLAS) revisar(tipos.get(tabla) === "BASE TABLE", `tabla ${tabla}`);
  for (const vista of VISTAS) revisar(tipos.get(vista) === "VIEW", `vista ${vista}`);
  return TABLAS.every((tabla) => tipos.get(tabla) === "BASE TABLE");
}

async function filas(cliente) {
  titulo("2. Filas por tabla");
  for (const tabla of TABLAS) {
    // El nombre sale de una lista fija; no viene del usuario.
    const { rows } = await cliente.query(`SELECT count(*)::int AS n FROM public.${tabla}`);
    console.log(`         ${tabla}: ${rows[0].n}`);
  }
}

async function restricciones(cliente) {
  titulo("3. Restricciones, índices y columnas generadas");
  const indices = await cliente.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [["ux_productos_nombre", "ux_turnos_un_abierto", "ux_turnos_fecha_nombre"]],
  );
  const nombresIndices = new Set(indices.rows.map((fila) => fila.indexname));
  for (const indice of ["ux_productos_nombre", "ux_turnos_un_abierto", "ux_turnos_fecha_nombre"]) {
    revisar(nombresIndices.has(indice), `índice ${indice}`);
  }

  const esperadas = [
    "productos_umbrales_coherentes",
    "registros_unico_por_turno",
    "registros_vendida_excede",
  ];
  const constraints = await cliente.query(
    `SELECT c.conname
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.conname = ANY($1::text[])`,
    [esperadas],
  );
  const nombresConstraints = new Set(constraints.rows.map((fila) => fila.conname));
  for (const nombre of esperadas) revisar(nombresConstraints.has(nombre), `restricción ${nombre}`);

  const generadas = await cliente.query(
    `SELECT column_name, is_generated
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registros_turno'
        AND column_name = ANY($1::text[])`,
    [["final_calculado", "total_venta"]],
  );
  const columnas = new Map(generadas.rows.map((fila) => [fila.column_name, fila.is_generated]));
  for (const columna of ["final_calculado", "total_venta"]) {
    revisar(columnas.get(columna) === "ALWAYS", `columna generada ${columna}`);
  }
}

async function seguridad(cliente) {
  titulo("4. RLS activo");
  const { rows } = await cliente.query(
    `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
    [TABLAS],
  );
  const rls = new Map(rows.map((fila) => [fila.relname, fila.relrowsecurity]));
  for (const tabla of TABLAS) revisar(rls.get(tabla) === true, `RLS en ${tabla}`);
}

async function integridad(cliente) {
  titulo("5. Pruebas de integridad (transacción con ROLLBACK)");
  await cliente.query("BEGIN");
  try {
    const insertarProducto = `INSERT INTO productos (nombre, seccion, categoria, valor_unitario, umbral_alerta, umbral_critico)
                              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;

    console.log("  a) Nombre único por sección");
    const [gaseosa] = await debeFuncionar(
      cliente,
      'producto bar "Verif Gaseosa"',
      insertarProducto,
      ["Verif Gaseosa", "bar", "Bebida", 3500, 6, null],
    );
    await debeFallar(
      cliente,
      '"verif gaseosa" otra vez en bar',
      insertarProducto,
      ["verif gaseosa", "bar", "Bebida", 3500, 6, null],
      "23505",
      "ux_productos_nombre",
    );
    await debeFuncionar(
      cliente,
      '"Verif Gaseosa" en helados (otra sección)',
      insertarProducto,
      ["Verif Gaseosa", "helados", "Helado", 3500, 5, 3],
    );

    console.log("  b) Umbrales coherentes");
    await debeFallar(
      cliente,
      "helado con umbral crítico NULL",
      insertarProducto,
      ["Verif Helado A", "helados", "Helado", 4000, 5, null],
      "23514",
      "productos_umbrales_coherentes",
    );
    await debeFallar(
      cliente,
      "helado con crítico 5 y alerta 5 (crítico no menor)",
      insertarProducto,
      ["Verif Helado B", "helados", "Helado", 4000, 5, 5],
      "23514",
      "productos_umbrales_coherentes",
    );

    console.log("  c) Valor unitario positivo");
    await debeFallar(
      cliente,
      "producto con valor_unitario 0",
      insertarProducto,
      ["Verif Gratis", "bar", "Bebida", 0, 6, null],
      "23514",
      "productos_valor_positivo",
    );

    console.log("  d) Un solo turno abierto");
    const insertarAbierto = `INSERT INTO turnos (fecha, nombre, encargado, estado)
                             VALUES ($1, $2, $3, 'abierto') RETURNING id`;
    const [turno] = await debeFuncionar(cliente, "turno abierto", insertarAbierto, [
      "2000-01-01",
      "Verif Abierto 1",
      "Verificador",
    ]);
    await debeFallar(
      cliente,
      "segundo turno abierto",
      insertarAbierto,
      ["2000-01-01", "Verif Abierto 2", "Verificador"],
      "23505",
      "ux_turnos_un_abierto",
    );

    console.log("  e) Fecha + nombre únicos");
    // Ya hay un turno abierto (caso d): estos dos van en revisión, con entregado_at.
    const insertarEnRevision = `INSERT INTO turnos (fecha, nombre, encargado, estado, entregado_at)
                                VALUES ($1, $2, $3, 'en_revision', now())`;
    await debeFuncionar(cliente, 'turno "Verif Noche" del 2000-01-02', insertarEnRevision, [
      "2000-01-02",
      "Verif Noche",
      "Verificador",
    ]);
    await debeFallar(
      cliente,
      'otro turno "verif noche" el mismo día',
      insertarEnRevision,
      ["2000-01-02", "verif noche", "Verificador"],
      "23505",
      "ux_turnos_fecha_nombre",
    );

    const insertarRegistro = `INSERT INTO registros_turno
                                (turno_id, producto_id, nombre, seccion, valor_unitario, inicial, entrada, vendida)
                              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                              RETURNING final_calculado, total_venta`;

    console.log("  f) Columnas generadas");
    const [registro] = await debeFuncionar(
      cliente,
      "registro inicial 24, entrada 12, vendida 18, valor 3500",
      insertarRegistro,
      [turno.id, gaseosa.id, "Verif Gaseosa", "bar", 3500, 24, 12, 18],
    );
    revisar(registro.final_calculado === 18, `final_calculado = 18 (llegó ${registro.final_calculado})`);
    revisar(registro.total_venta === 63000, `total_venta = 63000 (llegó ${registro.total_venta})`);

    // Para g) y h) se usa otro producto: registros_unico_por_turno impide repetir el par.
    const [otro] = await debeFuncionar(
      cliente,
      'producto bar "Verif Papitas" para g) y h)',
      insertarProducto,
      ["Verif Papitas", "bar", "Papitas", 2000, 6, null],
    );

    console.log("  g) Vendida no excede la existencia");
    await debeFallar(
      cliente,
      "registro con vendida 40 (inicial 24 + entrada 12 = 36)",
      insertarRegistro,
      [turno.id, otro.id, "Verif Papitas", "bar", 2000, 24, 12, 40],
      "23514",
      "registros_vendida_excede",
    );

    console.log("  h) Cantidades no negativas");
    // Entrada 5 para que solo falle registros_cantidades_validas (vendida 0 ≤ −1 + 5).
    await debeFallar(
      cliente,
      "registro con inicial −1",
      insertarRegistro,
      [turno.id, otro.id, "Verif Papitas", "bar", 2000, -1, 5, 0],
      "23514",
      "registros_cantidades_validas",
    );
  } catch (error) {
    console.log(`  Pruebas interrumpidas: ${error.message}`);
  } finally {
    await cliente.query("ROLLBACK");
    console.log("  ROLLBACK aplicado: no quedaron datos de prueba.");
  }
}

async function principal() {
  const destino = `${url.hostname}:${url.port || "5432"}`;
  console.log(`Verificación de la base del inventario (${destino})`);
  let cliente;
  try {
    cliente = await pool.connect();
  } catch (error) {
    console.error(`No se pudo conectar: ${error.code ?? ""} ${error.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    const hayTablas = await existencia(cliente);
    if (!hayTablas) {
      falla("faltan tablas: ejecuta npm run db:migrate antes de verificar");
    } else {
      await filas(cliente);
      await restricciones(cliente);
      await seguridad(cliente);
      await integridad(cliente);
    }
  } catch (error) {
    falla(`error inesperado: ${error.code ?? ""} ${error.message}`);
  } finally {
    cliente.release();
  }

  titulo(`6. Total de fallas: ${fallas}`);
  if (fallas > 0) process.exitCode = 1;
}

try {
  await principal();
} finally {
  await pool.end();
}
