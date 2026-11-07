// Lectura de parámetros de rutas del inventario.

/** Parámetros de la query string como objeto plano, para validarlos con Zod. */
export function leerConsulta(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

/** Contexto de una ruta dinámica: en Next 16, params es una Promise. */
export type ContextoRuta<P extends Record<string, string>> = { params: Promise<P> };
