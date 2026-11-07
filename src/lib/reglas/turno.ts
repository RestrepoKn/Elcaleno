// Flujo y resumen financiero del turno: RN-07 y RN-12 (plan, secciones 5 y 8).
// El inicial sugerido se calcula en la capa de datos, no aquí.

import {
  LONGITUD_ENCARGADO,
  LONGITUD_NOMBRE_TURNO,
  MONTO_MAXIMO,
} from "@/lib/config/inventario";
import { datosInvalidos } from "@/lib/reglas/errores";
import { esFechaValida } from "@/lib/reglas/fechas";

export type EstadoTurno = "abierto" | "en_revision" | "cerrado";

export const ETIQUETA_ESTADO_TURNO: Record<EstadoTurno, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  cerrado: "Cerrado",
};

/** Solo un turno abierto admite cambios en entrada, vendida, conteo o inicial. */
export function esEditable(estado: EstadoTurno): boolean {
  return estado === "abierto";
}

/** Entregar: abierto → en_revision, con conteo en todas las filas. */
export function puedeEntregar(estado: EstadoTurno, filasSinConteo: number): boolean {
  return estado === "abierto" && filasSinConteo === 0;
}

/** Cerrar: en_revision → cerrado, con facturas en efectivo y pago registrados. */
export function puedeCerrar(estado: EstadoTurno, finanzasRegistradas: boolean): boolean {
  return estado === "en_revision" && finanzasRegistradas;
}

/** Devolver: en_revision → abierto, solo si no hay un turno posterior. */
export function puedeDevolver(estado: EstadoTurno, hayTurnoPosterior: boolean): boolean {
  return estado === "en_revision" && !hayTurnoPosterior;
}

function textoValido(texto: string, maximo: number): boolean {
  const limpio = texto.trim();
  return limpio.length >= 1 && limpio.length <= maximo;
}

function montoValido(monto: number): boolean {
  return Number.isInteger(monto) && monto >= 0 && monto <= MONTO_MAXIMO;
}

/** Lanza DATOS_INVALIDOS si el nombre, el encargado o la fecha no son válidos. */
export function validarTurno(d: { nombre: string; encargado: string; fecha: string }): void {
  if (!textoValido(d.nombre, LONGITUD_NOMBRE_TURNO)) throw datosInvalidos("nombre");
  if (!textoValido(d.encargado, LONGITUD_ENCARGADO)) throw datosInvalidos("encargado");
  if (!esFechaValida(d.fecha)) throw datosInvalidos("fecha");
}

/** Lanza DATOS_INVALIDOS si las facturas o el pago no son pesos enteros ≥ 0. */
export function validarFinanzas(d: { facturasEfectivo: number; pagoEncargado: number }): void {
  if (!montoValido(d.facturasEfectivo)) throw datosInvalidos("facturasEfectivo");
  if (!montoValido(d.pagoEncargado)) throw datosInvalidos("pagoEncargado");
}

/** Suma de los totales de venta de todas las filas (bar + helados), RN-07. */
export function valorVentaTotal(totalesVenta: number[]): number {
  return totalesVenta.reduce((suma, total) => suma + total, 0);
}

/** Venta total − facturas en efectivo − pago al encargado. Puede ser negativo (RN-07). */
export function resultadoNeto(
  ventaTotal: number,
  facturasEfectivo: number,
  pagoEncargado: number,
): number {
  return ventaTotal - facturasEfectivo - pagoEncargado;
}
