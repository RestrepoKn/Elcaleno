// Buzón de sugerencias (extensión M5): categorías y validación del mensaje.

import { datosInvalidos } from "@/lib/reglas/errores";

export const CATEGORIAS_SUGERENCIA = ["sugerencia", "problema", "pedido", "otro"] as const;
export type CategoriaSugerencia = (typeof CATEGORIAS_SUGERENCIA)[number];

export const ETIQUETA_CATEGORIA: Record<CategoriaSugerencia, string> = {
  sugerencia: "Sugerencia",
  problema: "Problema",
  pedido: "Pedido",
  otro: "Otro",
};

export const MENSAJE_MINIMO = 3;
export const MENSAJE_MAXIMO = 1000;

export function esCategoriaSugerencia(valor: unknown): valor is CategoriaSugerencia {
  return typeof valor === "string" && (CATEGORIAS_SUGERENCIA as readonly string[]).includes(valor);
}

/** Lanza DATOS_INVALIDOS si la categoría no existe o el mensaje es muy corto o muy largo. */
export function validarSugerencia(d: { categoria: string; mensaje: string }): void {
  if (!esCategoriaSugerencia(d.categoria)) throw datosInvalidos("categoria");
  const mensaje = d.mensaje.trim();
  if (mensaje.length < MENSAJE_MINIMO || mensaje.length > MENSAJE_MAXIMO) throw datosInvalidos("mensaje");
}
