// Presentación de montos y fechas (plan, sección 14).

import { ZONA_HORARIA } from "@/lib/config/inventario";

const formatoPesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA_HORARIA,
  dateStyle: "medium",
  timeStyle: "short",
});

/** Pesos colombianos sin decimales; los negativos llevan signo menos (p. ej. "-$ 20.000"). */
export function formatearPesos(valor: number): string {
  return formatoPesos.format(valor);
}

/** 'YYYY-MM-DD' → "6 de noviembre de 2026". Se interpreta como fecha de calendario, sin corrimiento de zona. */
export function formatearFecha(fecha: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) return fecha;
  const instante = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return formatoFecha.format(instante);
}

/** Marca de tiempo (timestamptz en texto) mostrada en hora de Bogotá. */
export function formatearFechaHora(marca: string): string {
  const instante = new Date(marca);
  return Number.isNaN(instante.getTime()) ? marca : formatoFechaHora.format(instante);
}
