// Esquemas Zod de las entradas de la API del inventario (plan, sección 11.4).

import { z } from "zod";
import {
  CANTIDAD_MAXIMA,
  LONGITUD_CATEGORIA,
  LONGITUD_ENCARGADO,
  LONGITUD_NOMBRE_PRODUCTO,
  LONGITUD_NOMBRE_TURNO,
  LONGITUD_NUMERO_FACTURA,
  LONGITUD_PROVEEDOR,
  MONTO_MAXIMO,
  SECCIONES,
} from "@/lib/config/inventario";
import { esFechaValida } from "@/lib/reglas/fechas";

// Piezas comunes
const texto = (maximo: number) => z.string().trim().min(1).max(maximo);
const cantidad = z.number().int().min(0).max(CANTIDAD_MAXIMA);
const umbral = z.number().int().min(1).max(CANTIDAD_MAXIMA);
const valorUnitario = z.number().int().min(1).max(MONTO_MAXIMO);
const monto = z.number().int().min(0).max(MONTO_MAXIMO);
const seccion = z.enum(SECCIONES);
export const esquemaFecha = z
  .string()
  .refine(esFechaValida, { message: "Fecha inválida; use el formato AAAA-MM-DD." });

/** Booleano que llega como texto en la query string ("true"/"false", "1"/"0"). */
const booleanoQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

const alMenosUno = (objeto: Record<string, unknown>) =>
  Object.values(objeto).some((valor) => valor !== undefined);
const mensajeAlMenosUno = { message: "Indique al menos un campo para cambiar." };

// Productos
export const esquemaProducto = z.object({
  nombre: texto(LONGITUD_NOMBRE_PRODUCTO),
  seccion,
  categoria: texto(LONGITUD_CATEGORIA),
  valorUnitario,
  umbralAlerta: umbral.optional(),
  umbralCritico: umbral.nullable().optional(),
});
export type EntradaProducto = z.infer<typeof esquemaProducto>;

/** La sección no se cambia después de creado el producto: .strict() rechaza el campo seccion. */
export const esquemaCambiosProducto = z
  .object({
    nombre: texto(LONGITUD_NOMBRE_PRODUCTO).optional(),
    categoria: texto(LONGITUD_CATEGORIA).optional(),
    valorUnitario: valorUnitario.optional(),
    umbralAlerta: umbral.optional(),
    umbralCritico: umbral.nullable().optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine(alMenosUno, mensajeAlMenosUno);
export type EntradaCambiosProducto = z.infer<typeof esquemaCambiosProducto>;

export const esquemaFiltrosProductos = z.object({
  seccion: seccion.optional(),
  soloActivos: booleanoQuery.optional(),
});
export type FiltrosProductos = z.infer<typeof esquemaFiltrosProductos>;

// Turnos
export const esquemaTurno = z.object({
  fecha: esquemaFecha.optional(),
  nombre: texto(LONGITUD_NOMBRE_TURNO),
  encargado: texto(LONGITUD_ENCARGADO),
});
export type EntradaTurno = z.infer<typeof esquemaTurno>;

export const esquemaCambioRegistro = z
  .object({
    entrada: cantidad.optional(),
    vendida: cantidad.optional(),
    contado: cantidad.optional(),
    inicial: cantidad.optional(),
  })
  .strict()
  .refine(alMenosUno, mensajeAlMenosUno);
export type EntradaCambioRegistro = z.infer<typeof esquemaCambioRegistro>;

export const esquemaFinanzas = z.object({
  facturasEfectivo: monto,
  pagoEncargado: monto,
});
export type EntradaFinanzas = z.infer<typeof esquemaFinanzas>;

export const esquemaFiltrosInventario = z.object({
  seccion: seccion.optional(),
  soloPorReponer: booleanoQuery.optional(),
});
export type FiltrosInventario = z.infer<typeof esquemaFiltrosInventario>;

// Opcionales (P09)
export const esquemaCocina = z
  .object({
    producto: texto(LONGITUD_NOMBRE_PRODUCTO),
    fecha: esquemaFecha,
    existenciaInicial: cantidad,
    salida: cantidad,
  })
  .refine((d) => d.salida <= d.existenciaInicial, {
    message: "La salida no puede superar la existencia inicial.",
    path: ["salida"],
  });
export type EntradaCocina = z.infer<typeof esquemaCocina>;

export const esquemaFactura = z.object({
  numero: texto(LONGITUD_NUMERO_FACTURA),
  proveedor: texto(LONGITUD_PROVEEDOR),
  fecha: esquemaFecha,
  productoId: z.uuid(),
  valorUnitario,
  turnoId: z.uuid().optional(),
});
export type EntradaFactura = z.infer<typeof esquemaFactura>;
