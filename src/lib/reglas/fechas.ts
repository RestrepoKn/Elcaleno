// Fechas del inventario (plan, sección 14). Único archivo de reglas que puede leer el reloj.

import { ZONA_HORARIA } from "@/lib/config/inventario";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Bogotá, en formato 'YYYY-MM-DD'. */
export function hoyBogota(reloj: Date = new Date()): string {
  return formatoFecha.format(reloj);
}

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** true si el texto es una fecha de calendario real con formato 'YYYY-MM-DD'. */
export function esFechaValida(fecha: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) return false;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (anio < 2000 || mes < 1 || mes > 12 || dia < 1) return false;
  const diasDelMes = [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dia <= (diasDelMes[mes - 1] ?? 0);
}
