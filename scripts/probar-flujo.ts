// Prueba del flujo completo contra la base de datos (plan, sección 16.2), usando solo dataService.
// Uso: npm run probar:flujo
//
// - Se detiene si hay un turno abierto o productos activos que no empiecen por "Prueba"
//   (ejecútelo en una base sin catálogo real; antes, npm run db:limpiar).
// - Pasos 1 a 21 del plan, más pasos extra (14a, 14b, 13a, 17a, 19a, 22 a 28) para devolver,
//   la vista del encargado, el resultado neto negativo, RN-08, RN-13 y TURNO_DUPLICADO.
// - Limpia los datos "Prueba …" antes y al final. Código de salida 1 si algún paso falla.

import { loadEnvConfig } from "@next/env";
import { cerrarConexion } from "@/lib/db/conexion";
import {
  abrirTurno,
  actualizarProducto,
  ajustarInicial,
  cerrarTurno,
  crearProducto,
  devolverTurno,
  entregarTurno,
  inventarioActual,
  listarProductos,
  obtenerProducto,
  obtenerTurno,
  obtenerTurnoAbierto,
  registrarConteo,
  registrarFinanzas,
  registrarMovimiento,
  type RegistroTurno,
  type TurnoDetalle,
} from "@/lib/inventario/dataService";
import { ErrorDeNegocio, type CodigoError } from "@/lib/reglas/errores";
import { crearPoolScripts, limpiarDatosDePrueba } from "./limpiar-prueba.mjs";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const ADMIN = "administrador" as const;
let total = 0;
let fallas = 0;

function describir(error: unknown): string {
  if (error instanceof ErrorDeNegocio) return `${error.codigo}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

function igual(real: unknown, esperado: unknown, campo: string): void {
  if (real !== esperado) throw new Error(`${campo}: se esperaba ${String(esperado)} y llegó ${String(real)}`);
}

function registrar(ok: boolean, id: string, texto: string, motivo?: string): void {
  total++;
  if (ok) {
    console.log(`OK     ${id.padEnd(4)} ${texto}`);
  } else {
    fallas++;
    console.log(`FALLA  ${id.padEnd(4)} ${texto}\n             → ${motivo ?? ""}`);
  }
}

async function paso(id: string, texto: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const extra = await fn();
    registrar(true, id, extra ? `${texto} (${extra})` : texto);
  } catch (error) {
    registrar(false, id, texto, describir(error));
  }
}

async function pasoError(
  id: string,
  texto: string,
  codigo: CodigoError,
  fn: () => Promise<unknown>,
  verificar?: (e: ErrorDeNegocio) => void,
): Promise<void> {
  try {
    await fn();
    registrar(false, id, texto, `se esperaba ${codigo} y no hubo error`);
  } catch (error) {
    if (!(error instanceof ErrorDeNegocio) || error.codigo !== codigo) {
      registrar(false, id, texto, `se esperaba ${codigo} y llegó ${describir(error)}`);
      return;
    }
    try {
      verificar?.(error);
      registrar(true, id, `${texto} → ${codigo}`);
    } catch (fallo) {
      registrar(false, id, texto, describir(fallo));
    }
  }
}

function fila(turno: TurnoDetalle, productoId: string): RegistroTurno {
  const encontrada = turno.registros.find((r) => r.productoId === productoId);
  if (!encontrada) throw new Error(`el turno "${turno.nombre}" no tiene fila del producto ${productoId}`);
  return encontrada;
}

async function principal(): Promise<void> {
  const pool = crearPoolScripts();
  const cliente = await pool.connect();
  try {
    await limpiarDatosDePrueba(cliente, { incluirDemo: false });

    const ajenos = (await listarProductos({ soloActivos: true })).filter((p) => !/^prueba /i.test(p.nombre));
    if (ajenos.length > 0) {
      console.error(
        `Hay ${ajenos.length} productos activos que no son de prueba (por ejemplo "${ajenos[0]?.nombre}"). ` +
          "Ejecute npm run db:limpiar o use una base sin catálogo real.",
      );
      process.exitCode = 1;
      return;
    }
    if (await obtenerTurnoAbierto(ADMIN)) {
      console.error("Hay un turno abierto. La prueba necesita una base sin turno abierto.");
      process.exitCode = 1;
      return;
    }

    let gaseosa = "";
    let helado = "";
    let t1 = "";
    let t2 = "";
    let t3 = "";

    await paso("1", 'Crear "Prueba Gaseosa" (bar, Bebida, 3500)', async () => {
      gaseosa = (await crearProducto({ nombre: "Prueba Gaseosa", seccion: "bar", categoria: "Bebida", valorUnitario: 3500 })).id;
      const p = await obtenerProducto(gaseosa);
      igual(p.activo, true, "activo");
      igual(p.umbralAlerta, 6, "umbral");
      igual(p.umbralCritico, null, "umbral crítico");
      return "activo, umbral 6";
    });

    await pasoError("2", 'Crear "prueba gaseosa" otra vez en el bar', "PRODUCTO_DUPLICADO", () =>
      crearProducto({ nombre: "prueba gaseosa", seccion: "bar", categoria: "Bebida", valorUnitario: 3500 }),
    );

    await pasoError("3", "Crear un producto con valor 0", "DATOS_INVALIDOS", () =>
      crearProducto({ nombre: "Prueba Cero", seccion: "bar", categoria: "Otro", valorUnitario: 0 }),
    );

    await paso("4", 'Crear "Prueba Helado" (helados, 4000)', async () => {
      helado = (await crearProducto({ nombre: "Prueba Helado", seccion: "helados", categoria: "Helado", valorUnitario: 4000 })).id;
      const p = await obtenerProducto(helado);
      igual(p.umbralAlerta, 5, "umbral amarillo");
      igual(p.umbralCritico, 3, "umbral rojo");
      return "umbrales 5 y 3";
    });

    await paso("5", 'Abrir el turno "Prueba"', async () => {
      const t = await abrirTurno({ nombre: "Prueba", encargado: "Encargado de prueba" }, ADMIN);
      t1 = t.id;
      igual(t.estado, "abierto", "estado");
      igual(t.registros.length, 2, "filas");
      igual(fila(t, gaseosa).inicial, 0, "inicial gaseosa");
      igual(fila(t, helado).inicial, 0, "inicial helado");
      igual(fila(t, gaseosa).valorUnitario, 3500, "valor copiado gaseosa");
      igual(fila(t, helado).valorUnitario, 4000, "valor copiado helado");
      return "2 filas, inicial 0, valores copiados";
    });

    await pasoError("6", "Abrir otro turno estando uno abierto", "TURNO_YA_ABIERTO", () =>
      abrirTurno({ nombre: "Prueba Otro", encargado: "Encargado de prueba" }, ADMIN),
    );

    const filaDe = async (turnoId: string, productoId: string) => fila(await obtenerTurno(turnoId, ADMIN), productoId);

    await paso("7", "Ajustar el inicial: gaseosa 24, helado 12", async () => {
      igual((await ajustarInicial(t1, (await filaDe(t1, gaseosa)).id, 24)).inicial, 24, "inicial gaseosa");
      igual((await ajustarInicial(t1, (await filaDe(t1, helado)).id, 12)).inicial, 12, "inicial helado");
    });

    await paso("8", "Gaseosa: entrada 12, vendida 18", async () => {
      const r = await registrarMovimiento(t1, (await filaDe(t1, gaseosa)).id, { entrada: 12, vendida: 18 });
      igual(r.finalCalculado, 18, "inventario final");
      igual(r.totalVenta, 63000, "total de venta");
      return "inventario final 18, total 63000";
    });

    await pasoError("9", "Gaseosa: vendida 40", "VENDIDO_EXCEDE_EXISTENCIA", async () =>
      registrarMovimiento(t1, (await filaDe(t1, gaseosa)).id, { vendida: 40 }),
    );

    await paso("10", "Helado: vendida 10", async () => {
      const r = await registrarMovimiento(t1, (await filaDe(t1, helado)).id, { vendida: 10 });
      igual(r.finalCalculado, 2, "inventario final");
      igual(r.totalVenta, 40000, "total de venta");
      return "inventario final 2, total 40000";
    });

    await pasoError("11", "Entregar el turno sin conteos", "TURNO_INCOMPLETO", () => entregarTurno(t1, ADMIN), (e) =>
      igual((e.detalles as { filasSinConteo?: number }).filasSinConteo, 2, "filas sin conteo"),
    );

    await paso("12", "Conteo gaseosa 16", async () => {
      const r = await registrarConteo(t1, (await filaDe(t1, gaseosa)).id, 16);
      igual(r.estadoConteo, "faltante", "estado del conteo");
      igual(r.faltante, 2, "faltante");
      igual(r.valorACancelar, 7000, "valor a cancelar");
      igual(r.nivelAlerta, "ninguna", "alerta");
      return "faltante 2, valor a cancelar 7000, sin alerta";
    });

    await paso("13", "Conteo helado 2", async () => {
      const r = await registrarConteo(t1, (await filaDe(t1, helado)).id, 2);
      igual(r.estadoConteo, "cuadra", "estado del conteo");
      igual(r.nivelAlerta, "roja", "alerta");
      return "cuadra, alerta roja";
    });

    await paso("13a", 'Inventario actual "por reponer"', async () => {
      const lista = await inventarioActual({ soloPorReponer: true });
      igual(lista.find((f) => f.productoId === helado)?.nivelAlerta, "roja", "helado en la lista");
      igual(lista.some((f) => f.productoId === gaseosa), false, "gaseosa fuera de la lista");
      return "helado en rojo; gaseosa (16) fuera";
    });

    await paso("14", "Entregar el turno", async () => {
      igual((await entregarTurno(t1, ADMIN)).estado, "en_revision", "estado");
    });

    await paso("14a", "Devolver al encargado (sin turno posterior)", async () => {
      const t = await devolverTurno(t1, ADMIN);
      igual(t.estado, "abierto", "estado");
      igual(t.entregadoAt, null, "entregado_at");
    });

    await paso("14b", "Entregar de nuevo", async () => {
      igual((await entregarTurno(t1, ADMIN)).estado, "en_revision", "estado");
    });

    await pasoError("15", "Registrar entrada en el turno entregado", "TURNO_NO_EDITABLE", async () =>
      registrarMovimiento(t1, (await filaDe(t1, gaseosa)).id, { entrada: 1 }),
    );

    await pasoError("16", "Cerrar el turno sin facturas ni pago", "TURNO_INCOMPLETO", () => cerrarTurno(t1, ADMIN));

    await paso("17", "Registrar facturas en efectivo 30000 y pago 40000", async () => {
      const t = await registrarFinanzas(t1, { facturasEfectivo: 30000, pagoEncargado: 40000 }, ADMIN);
      igual(t.ventaTotal, 103000, "venta total");
      igual(t.resultadoNeto, 33000, "resultado neto");
      return "venta total 103000, resultado neto 33000";
    });

    await paso("17a", "El encargado no ve facturas, pago ni resultado neto", async () => {
      const t = await obtenerTurno(t1, "encargado");
      igual(t.facturasEfectivo, null, "facturas");
      igual(t.pagoEncargado, null, "pago");
      igual(t.resultadoNeto, null, "resultado neto");
      igual(t.ventaTotal, 103000, "venta total visible");
    });

    await paso("18", "Cerrar el turno", async () => {
      const t = await cerrarTurno(t1, ADMIN);
      igual(t.estado, "cerrado", "estado");
      igual(t.ventaTotalCierre, 103000, "venta total guardada");
      igual(t.resultadoNetoCierre, 33000, "resultado neto guardado");
      return "venta 103000 y neto 33000 guardados";
    });

    await pasoError("19", "Devolver el turno cerrado", "TRANSICION_INVALIDA", () => devolverTurno(t1, ADMIN));

    await pasoError("19a", "Registrar finanzas en el turno cerrado", "TURNO_NO_EDITABLE", () =>
      registrarFinanzas(t1, { facturasEfectivo: 1, pagoEncargado: 1 }, ADMIN),
    );

    await paso("20", 'Abrir el turno "Prueba 2"', async () => {
      const t = await abrirTurno({ nombre: "Prueba 2", encargado: "Encargado de prueba" }, ADMIN);
      t2 = t.id;
      igual(fila(t, gaseosa).inicial, 16, "inicial gaseosa");
      igual(fila(t, helado).inicial, 2, "inicial helado");
      return "inicial 16 y 2 (conteo del turno anterior)";
    });

    await pasoError("21", 'Devolver "Prueba" (cerrado) con un turno posterior', "TRANSICION_INVALIDA", () =>
      devolverTurno(t1, ADMIN),
    );

    await paso("22", '"Prueba 2": conteo completo y entrega', async () => {
      await registrarConteo(t2, (await filaDe(t2, gaseosa)).id, 16);
      await registrarConteo(t2, (await filaDe(t2, helado)).id, 2);
      igual((await entregarTurno(t2, ADMIN)).estado, "en_revision", "estado");
    });

    await paso("23", '"Prueba 2": facturas 5000 y pago 2000 sin ventas', async () => {
      const t = await registrarFinanzas(t2, { facturasEfectivo: 5000, pagoEncargado: 2000 }, ADMIN);
      igual(t.ventaTotal, 0, "venta total");
      igual(t.resultadoNeto, -7000, "resultado neto");
      return "resultado neto −7000 (negativo permitido)";
    });

    await paso("24", 'Abrir el turno "Prueba 3"', async () => {
      t3 = (await abrirTurno({ nombre: "Prueba 3", encargado: "Encargado de prueba" }, ADMIN)).id;
    });

    await pasoError(
      "25",
      'Devolver "Prueba 2" (en revisión) con un turno posterior',
      "TRANSICION_INVALIDA",
      () => devolverTurno(t2, ADMIN),
      (e) => igual((e.detalles as { hayTurnoPosterior?: boolean }).hayTurnoPosterior, true, "turno posterior"),
    );

    await paso("26", 'Crear "Prueba Agua" con "Prueba 3" abierto (RN-13)', async () => {
      const { id } = await crearProducto({ nombre: "Prueba Agua", seccion: "bar", categoria: "Bebida", valorUnitario: 2500 });
      const r = await filaDe(t3, id);
      igual(r.inicial, 0, "inicial");
      igual(r.valorUnitario, 2500, "valor copiado");
      return "entra al turno abierto con inicial 0";
    });

    await paso("27", "Cambiar el valor de la gaseosa con el turno abierto (RN-08)", async () => {
      await actualizarProducto(gaseosa, { valorUnitario: 4000 });
      igual((await obtenerProducto(gaseosa)).valorUnitario, 4000, "valor del producto");
      igual((await filaDe(t3, gaseosa)).valorUnitario, 3500, "valor de la fila del turno abierto");
      return "el turno abierto conserva 3500";
    });

    await pasoError(
      "28",
      'Abrir otra vez "prueba 3" el mismo día',
      "TURNO_DUPLICADO",
      async () => {
        const t = await obtenerTurno(t3, ADMIN);
        for (const r of t.registros) await registrarConteo(t3, r.id, r.finalCalculado);
        await entregarTurno(t3, ADMIN);
        return abrirTurno({ fecha: t.fecha, nombre: "prueba 3", encargado: "Encargado de prueba" }, ADMIN);
      },
    );
  } finally {
    try {
      await limpiarDatosDePrueba(cliente, { incluirDemo: false });
    } finally {
      cliente.release();
      await pool.end();
      await cerrarConexion();
    }
  }

  console.log(`\n${total - fallas} de ${total} pasos OK; fallas: ${fallas}.`);
  if (fallas > 0) process.exitCode = 1;
}

principal().catch((error: unknown) => {
  console.error(`La prueba no pudo ejecutarse: ${describir(error)}`);
  process.exitCode = 1;
});
