// F5 · Turno de cocina (opcional): RN-17.

import { LONGITUD_NOMBRE_PRODUCTO } from "@/lib/config/inventario";
import { datosInvalidos } from "@/lib/reglas/errores";
import { esFechaValida } from "@/lib/reglas/fechas";
import { esCantidadValida } from "@/lib/reglas/registro";

/** Inventario final esperado = existencia inicial − salida. La salida no puede superar la existencia. */
export function inventarioFinalCocina(existenciaInicial: number, salida: number): number {
  if (!esCantidadValida(existenciaInicial)) throw datosInvalidos("existenciaInicial");
  if (!esCantidadValida(salida) || salida > existenciaInicial) throw datosInvalidos("salida");
  return existenciaInicial - salida;
}

/** Lanza DATOS_INVALIDOS si el registro de cocina no es válido. */
export function validarCocina(d: { producto: string; fecha: string; existenciaInicial: number; salida: number }): void {
  const producto = d.producto.trim();
  if (producto.length < 1 || producto.length > LONGITUD_NOMBRE_PRODUCTO) throw datosInvalidos("producto");
  if (!esFechaValida(d.fecha)) throw datosInvalidos("fecha");
  inventarioFinalCocina(d.existenciaInicial, d.salida);
}
