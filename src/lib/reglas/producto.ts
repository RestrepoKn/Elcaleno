// Reglas del producto: RN-01 y RN-02.

import {
  CANTIDAD_MAXIMA,
  LONGITUD_CATEGORIA,
  LONGITUD_NOMBRE_PRODUCTO,
  MONTO_MAXIMO,
  SECCIONES,
  UMBRALES_POR_DEFECTO,
} from "@/lib/config/inventario";
import { datosInvalidos } from "@/lib/reglas/errores";

export type Seccion = "bar" | "helados";

export function esSeccionValida(valor: unknown): valor is Seccion {
  return typeof valor === "string" && (SECCIONES as readonly string[]).includes(valor);
}

/** Umbrales que recibe un producto nuevo si no se indican (RN-02). */
export function umbralesPorDefecto(seccion: Seccion): {
  umbralAlerta: number;
  umbralCritico: number | null;
} {
  return { ...UMBRALES_POR_DEFECTO[seccion] };
}

function textoValido(texto: string, maximo: number): boolean {
  const limpio = texto.trim();
  return limpio.length >= 1 && limpio.length <= maximo;
}

function umbralValido(umbral: number): boolean {
  return Number.isInteger(umbral) && umbral > 0 && umbral <= CANTIDAD_MAXIMA;
}

/** Lanza DATOS_INVALIDOS (con el campo en detalles) si el producto no cumple RN-01 o RN-02. */
export function validarProducto(d: {
  nombre: string;
  seccion: Seccion;
  categoria: string;
  valorUnitario: number;
  umbralAlerta: number;
  umbralCritico: number | null;
}): void {
  if (!textoValido(d.nombre, LONGITUD_NOMBRE_PRODUCTO)) throw datosInvalidos("nombre");
  if (!esSeccionValida(d.seccion)) throw datosInvalidos("seccion");
  if (!textoValido(d.categoria, LONGITUD_CATEGORIA)) throw datosInvalidos("categoria");
  if (!Number.isInteger(d.valorUnitario) || d.valorUnitario <= 0 || d.valorUnitario > MONTO_MAXIMO) {
    throw datosInvalidos("valorUnitario");
  }
  if (!umbralValido(d.umbralAlerta)) throw datosInvalidos("umbralAlerta");

  if (d.seccion === "bar") {
    // El bar tiene un solo umbral ("por reponer").
    if (d.umbralCritico !== null) throw datosInvalidos("umbralCritico");
    return;
  }

  // Helados: el umbral rojo existe y es menor que el amarillo.
  if (
    d.umbralCritico === null ||
    !umbralValido(d.umbralCritico) ||
    d.umbralCritico >= d.umbralAlerta
  ) {
    throw datosInvalidos("umbralCritico");
  }
}
