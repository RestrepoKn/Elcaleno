// Respuestas HTTP del inventario (plan, secciones 9.4, 11.1 y 11.2).
// Formato: { ok: true, datos } o { ok: false, error: { codigo, mensaje, detalles } }; siempre Cache-Control: no-store.

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  ErrorDeNegocio,
  ESTADO_HTTP,
  MENSAJES,
  type CodigoError,
} from "@/lib/reglas/errores";

const SIN_CACHE = { "Cache-Control": "no-store" } as const;

export type RespuestaOk<T> = { ok: true; datos: T };
export type RespuestaError = {
  ok: false;
  error: { codigo: CodigoError; mensaje: string; detalles: unknown };
};

export function responderOk<T>(datos: T, estado = 200): NextResponse<RespuestaOk<T>> {
  return NextResponse.json({ ok: true, datos }, { status: estado, headers: SIN_CACHE });
}

function cuerpoError(codigo: CodigoError, mensaje: string, detalles: unknown): RespuestaError {
  return { ok: false, error: { codigo, mensaje, detalles } };
}

function responderCodigo(codigo: CodigoError, mensaje?: string, detalles: unknown = null) {
  return NextResponse.json(cuerpoError(codigo, mensaje ?? MENSAJES[codigo], detalles), {
    status: ESTADO_HTTP[codigo],
    headers: SIN_CACHE,
  });
}

// Restricciones UNIQUE con su código de negocio (tabla 9.4).
const RESTRICCIONES_UNICAS: Record<string, CodigoError> = {
  ux_productos_nombre: "PRODUCTO_DUPLICADO",
  ux_turnos_un_abierto: "TURNO_YA_ABIERTO",
  ux_turnos_fecha_nombre: "TURNO_DUPLICADO",
  ux_facturas_numero_producto: "FACTURA_DUPLICADA",
};

type ErrorPostgres = { code: string; constraint?: string | undefined };

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/** Traduce los errores de restricciones de Postgres; null si no es uno de los esperados. */
export function traducirErrorPostgres(error: unknown): CodigoError | null {
  if (!esErrorPostgres(error)) return null;
  const restriccion = error.constraint ?? "";
  switch (error.code) {
    case "23505":
      return RESTRICCIONES_UNICAS[restriccion] ?? null;
    case "23503":
      return "PRODUCTO_CON_REGISTROS";
    case "23514":
      return restriccion === "registros_vendida_excede" ? "VENDIDO_EXCEDE_EXISTENCIA" : "DATOS_INVALIDOS";
    default:
      return null;
  }
}

export function responderError(error: unknown): NextResponse<RespuestaError> {
  if (error instanceof ErrorDeNegocio) {
    return responderCodigo(error.codigo, error.message, error.detalles);
  }
  if (error instanceof ZodError) {
    return responderCodigo("DATOS_INVALIDOS", undefined, z.flattenError(error));
  }
  const codigo = traducirErrorPostgres(error);
  if (codigo) return responderCodigo(codigo);

  // Error no previsto: se registra en consola y el usuario no recibe detalles técnicos.
  console.error("[inventario] error interno", error);
  return responderCodigo("ERROR_INTERNO");
}

/** Envuelve un handler de ruta: cualquier error se responde con responderError. Conserva sus argumentos. */
export function conManejoDeErrores<A extends unknown[]>(
  handler: (...args: A) => Promise<Response> | Response,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      return responderError(error);
    }
  };
}

/** Lee el cuerpo JSON y lo valida con el esquema; JSON inválido → DATOS_INVALIDOS, esquema → ZodError. */
export async function leerCuerpo<S extends z.ZodType>(request: Request, esquema: S): Promise<z.output<S>> {
  let crudo: unknown;
  try {
    crudo = await request.json();
  } catch {
    throw new ErrorDeNegocio("DATOS_INVALIDOS", undefined, { cuerpo: "JSON inválido" });
  }
  return esquema.parse(crudo);
}
