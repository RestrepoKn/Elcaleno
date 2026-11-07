// Carga datos de demostración del inventario.
// Uso: npm run db:demo
//
// - Limpia antes los datos "Prueba …" y "Demo …".
// - Crea productos "Demo …" de bar y de helados, y un turno "Demo Mañana" ya cerrado,
//   con movimientos, conteo (un faltante, un sobrante) y finanzas. Así el inventario actual muestra
//   todas las alertas: sin alerta, por reponer (bar), amarilla y roja (helados).
// - Crea dos usuarios de demostración (administrador y encargado) con contraseñas nuevas, que se imprimen.
// No deja un turno abierto: se puede abrir uno desde la aplicación.

import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/password";
import { cerrarConexion } from "@/lib/db/conexion";
import {
  abrirTurno,
  actualizarRegistro,
  cerrarTurno,
  crearProducto,
  entregarTurno,
  inventarioActual,
  obtenerTurnoAbierto,
  registrarFinanzas,
  type DatosProducto,
} from "@/lib/inventario/dataService";
import { formatearPesos } from "@/lib/formato";
import { ETIQUETA_ALERTA } from "@/lib/reglas/alertas";
import { crearPoolScripts, DOMINIO_DEMO, limpiarDatosDePrueba } from "./limpiar-prueba.mjs";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

type Demo = DatosProducto & { inicial: number; entrada: number; vendida: number; contado: number };

// Inventario de referencia final = contado.
const PRODUCTOS: Demo[] = [
  { nombre: "Demo Gaseosa 400 ml", seccion: "bar", categoria: "Bebida", valorUnitario: 3500, inicial: 24, entrada: 12, vendida: 18, contado: 16 }, // faltante 2 → 16, sin alerta
  { nombre: "Demo Cerveza", seccion: "bar", categoria: "Bebida", valorUnitario: 6000, inicial: 10, entrada: 0, vendida: 6, contado: 4 }, // por reponer
  { nombre: "Demo Agua", seccion: "bar", categoria: "Bebida", valorUnitario: 2500, inicial: 6, entrada: 0, vendida: 0, contado: 6 }, // borde: 6 sin alerta
  { nombre: "Demo Papitas", seccion: "bar", categoria: "Papitas", valorUnitario: 3000, inicial: 8, entrada: 0, vendida: 3, contado: 5 }, // borde: 5 por reponer
  { nombre: "Demo Chocolatina", seccion: "bar", categoria: "Confitería", valorUnitario: 2000, inicial: 5, entrada: 0, vendida: 2, contado: 4 }, // sobrante 1, por reponer
  { nombre: "Demo Helado de vainilla", seccion: "helados", categoria: "Helado", valorUnitario: 4000, inicial: 12, entrada: 0, vendida: 7, contado: 5 }, // borde: 5 sin alerta
  { nombre: "Demo Helado de fresa", seccion: "helados", categoria: "Helado", valorUnitario: 4000, inicial: 8, entrada: 0, vendida: 5, contado: 3 }, // borde: 3 amarilla
  { nombre: "Demo Helado de chocolate", seccion: "helados", categoria: "Helado", valorUnitario: 4500, inicial: 6, entrada: 0, vendida: 4, contado: 1 }, // faltante 1, roja
];

const USUARIOS = [
  { email: `admin${DOMINIO_DEMO}`, nombre: "Administrador demo", rol: "administrador", rolLogin: "admin" },
  { email: `encargado${DOMINIO_DEMO}`, nombre: "Encargado demo", rol: "encargado", rolLogin: "user" },
] as const;

async function principal(): Promise<void> {
  const pool = crearPoolScripts();
  const cliente = await pool.connect();
  try {
    const limpieza = await limpiarDatosDePrueba(cliente, { incluirDemo: true });
    console.log(`Limpieza previa: ${limpieza.turnos} turnos y ${limpieza.productosBorrados} productos demo o de prueba.`);

    if (await obtenerTurnoAbierto("administrador")) {
      console.error("Hay un turno abierto. Entréguelo y ciérrelo antes de cargar la demostración.");
      process.exitCode = 1;
      return;
    }

    const porId = new Map<string, Demo>();
    for (const p of PRODUCTOS) {
      const { id } = await crearProducto({
        nombre: p.nombre,
        seccion: p.seccion,
        categoria: p.categoria,
        valorUnitario: p.valorUnitario,
      });
      porId.set(id, p);
    }
    console.log(`Productos creados: ${PRODUCTOS.length}.`);

    const turno = await abrirTurno({ nombre: "Demo Mañana", encargado: "Encargado demo" }, "administrador");
    for (const fila of turno.registros) {
      const p = porId.get(fila.productoId);
      if (!p) continue; // producto real activo: queda con su inicial sugerido y sin movimientos
      await actualizarRegistro(turno.id, fila.id, {
        inicial: p.inicial,
        entrada: p.entrada,
        vendida: p.vendida,
        contado: p.contado,
      });
    }
    await entregarTurno(turno.id, "administrador");
    await registrarFinanzas(turno.id, { facturasEfectivo: 30000, pagoEncargado: 40000 }, "administrador");
    const cerrado = await cerrarTurno(turno.id, "administrador");
    console.log(
      `Turno "${cerrado.nombre}" del ${cerrado.fecha}: venta total ${formatearPesos(cerrado.ventaTotal)}, ` +
        `faltantes ${formatearPesos(cerrado.totalACancelar)}, resultado neto ${formatearPesos(cerrado.resultadoNeto ?? 0)}.`,
    );

    console.log("\nInventario actual:");
    for (const f of await inventarioActual()) {
      if (!f.nombre.startsWith("Demo ")) continue;
      console.log(`  ${f.seccion.padEnd(8)} ${f.nombre.padEnd(26)} ${String(f.inventario).padStart(3)}  ${ETIQUETA_ALERTA[f.nivelAlerta]}`);
    }

    console.log("\nUsuarios de demostración (contraseñas nuevas en cada ejecución):");
    for (const u of USUARIOS) {
      const contrasena = randomBytes(9).toString("base64url");
      await cliente.query(
        `insert into users (email, name, password_hash, role, active) values ($1, $2, $3, $4, true)
         on conflict (email) do update
           set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role,
               active = true, updated_at = now()`,
        [u.email, u.nombre, await hashPassword(contrasena), u.rolLogin],
      );
      await cliente.query(
        "insert into acceso (email, rol) values ($1, $2) on conflict (email) do update set rol = excluded.rol",
        [u.email, u.rol],
      );
      console.log(`  ${u.rol.padEnd(13)} ${u.email}  contraseña: ${contrasena}`);
    }
  } finally {
    cliente.release();
    await pool.end();
    await cerrarConexion();
  }
}

principal().catch((error: unknown) => {
  const e = error as { codigo?: string; code?: string; message?: string };
  console.error(`No se pudo cargar la demostración: ${e.codigo ?? e.code ?? ""} ${e.message ?? String(error)}`);
  process.exitCode = 1;
});
