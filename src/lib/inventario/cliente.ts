// Llamadas a la API del inventario desde componentes de cliente.
// No importa nada del servidor: solo fetch y el formato de respuesta de la sección 11.1.

import type { CodigoError } from "@/lib/reglas/errores";

export class ErrorApi extends Error {
  readonly codigo: CodigoError;
  readonly detalles: unknown;
  readonly estado: number;

  constructor(codigo: CodigoError, mensaje: string, detalles: unknown, estado: number) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
    this.detalles = detalles;
    this.estado = estado;
  }
}

type Respuesta<T> =
  | { ok: true; datos: T }
  | { ok: false; error: { codigo: CodigoError; mensaje: string; detalles: unknown } };

/** Llama a /api/inventario{ruta}; devuelve datos o lanza ErrorApi con el mensaje para el usuario. */
export async function llamarApi<T>(
  ruta: string,
  opciones: { metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; cuerpo?: unknown } = {},
): Promise<T> {
  let respuesta: Response;
  try {
    const conCuerpo = opciones.cuerpo !== undefined;
    respuesta = await fetch(`/api/inventario${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: conCuerpo ? { "Content-Type": "application/json" } : {},
      body: conCuerpo ? JSON.stringify(opciones.cuerpo) : null,
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi("ERROR_INTERNO", "No hay conexión. Revise la red e intente de nuevo.", null, 0);
  }

  let cuerpo: Respuesta<T> | null = null;
  try {
    cuerpo = (await respuesta.json()) as Respuesta<T>;
  } catch {
    cuerpo = null;
  }
  if (cuerpo?.ok) return cuerpo.datos;
  if (cuerpo && !cuerpo.ok) {
    throw new ErrorApi(cuerpo.error.codigo, cuerpo.error.mensaje, cuerpo.error.detalles, respuesta.status);
  }
  throw new ErrorApi("ERROR_INTERNO", "Ocurrió un error inesperado. Intente de nuevo.", null, respuesta.status);
}

/** Envía un archivo (multipart) a /api/inventario{ruta}; mismo manejo de respuesta que llamarApi. */
export async function enviarArchivo<T>(ruta: string, campo: string, archivo: Blob, nombre: string): Promise<T> {
  const formulario = new FormData();
  formulario.append(campo, archivo, nombre);
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api/inventario${ruta}`, { method: "POST", body: formulario, cache: "no-store" });
  } catch {
    throw new ErrorApi("ERROR_INTERNO", "No hay conexión. Revise la red e intente de nuevo.", null, 0);
  }
  let cuerpo: Respuesta<T> | null = null;
  try {
    cuerpo = (await respuesta.json()) as Respuesta<T>;
  } catch {
    cuerpo = null;
  }
  if (cuerpo?.ok) return cuerpo.datos;
  if (cuerpo && !cuerpo.ok) {
    throw new ErrorApi(cuerpo.error.codigo, cuerpo.error.mensaje, cuerpo.error.detalles, respuesta.status);
  }
  if (respuesta.status === 413) {
    throw new ErrorApi("FOTO_INVALIDA", "La foto es demasiado grande.", null, 413);
  }
  throw new ErrorApi("ERROR_INTERNO", "Ocurrió un error inesperado. Intente de nuevo.", null, respuesta.status);
}

/** Mensaje para mostrar a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  return "Ocurrió un error inesperado. Intente de nuevo.";
}
