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
import { traducirErrorPostgres } from "@/lib/reglas/errores-bd";

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

// La traducción de restricciones (tabla 9.4) vive en lib/reglas para que la capa de datos también la use.
export { traducirErrorPostgres };

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
