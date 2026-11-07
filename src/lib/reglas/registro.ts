// Cálculos de una fila del turno: RN-03, RN-04, RN-05, RN-06 y RN-10 (plan, sección 8).

import { CANTIDAD_MAXIMA } from "@/lib/config/inventario";
import { datosInvalidos, ErrorDeNegocio } from "@/lib/reglas/errores";

export type EstadoConteo = "sin_conteo" | "cuadra" | "faltante" | "sobrante";

export function inventarioFinalCalculado(inicial: number, entrada: number, vendida: number): number {
  return inicial + entrada - vendida; // RN-03
}

export function totalVenta(vendida: number, valorUnitario: number): number {
  return vendida * valorUnitario; // RN-04
}

export function faltante(calculado: number, contado: number | null): number {
  return contado !== null && contado < calculado ? calculado - contado : 0; // RN-05
}

export function sobrante(calculado: number, contado: number | null): number {
  return contado !== null && contado > calculado ? contado - calculado : 0; // RN-05
}

export function valorACancelar(unidadesFaltantes: number, valorUnitario: number): number {
  return unidadesFaltantes * valorUnitario; // RN-05
}

/** Resultado del conteo de una fila (sección 5.3). */
export function estadoConteo(calculado: number, contado: number | null): EstadoConteo {
  if (contado === null) return "sin_conteo";
  if (contado < calculado) return "faltante";
  if (contado > calculado) return "sobrante";
  return "cuadra";
}

/** Inventario usado para alertas e inicial sugerido: el contado si existe; si no, el calculado (RN-06). */
export function inventarioReferencia(calculado: number, contado: number | null): number {
  return contado ?? calculado;
}

/** Entero entre 0 y CANTIDAD_MAXIMA (RN-10). */
export function esCantidadValida(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 0 && valor <= CANTIDAD_MAXIMA;
}

/** Lanza DATOS_INVALIDOS o VENDIDO_EXCEDE_EXISTENCIA (RN-10). */
export function validarMovimiento(inicial: number, entrada: number, vendida: number): void {
  if (!esCantidadValida(inicial)) throw datosInvalidos("inicial");
  if (!esCantidadValida(entrada)) throw datosInvalidos("entrada");
  if (!esCantidadValida(vendida)) throw datosInvalidos("vendida");
  const disponible = inicial + entrada;
  if (vendida > disponible) {
    throw new ErrorDeNegocio("VENDIDO_EXCEDE_EXISTENCIA", undefined, { disponible, vendida });
  }
}

/** Lanza DATOS_INVALIDOS si el conteo físico no es un entero entre 0 y CANTIDAD_MAXIMA (RN-10). */
export function validarConteo(contado: number): void {
  if (!esCantidadValida(contado)) throw datosInvalidos("contado");
}
