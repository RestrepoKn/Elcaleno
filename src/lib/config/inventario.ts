// Configuración del módulo de inventario (plan, sección 10.4).
// Los umbrales y topes salen de aquí o del producto; nunca números sueltos en el código.

export const SECCIONES = ["bar", "helados"] as const;
export const CATEGORIAS_BAR = ["Bebida", "Papitas", "Confitería", "Otro"] as const;
export const CATEGORIA_HELADOS = "Helado";

export const UMBRAL_BAR = 6; // alerta "por reponer" del bar
export const UMBRAL_HELADOS_AMARILLO = 5; // helados: alerta amarilla (menos de 5)
export const UMBRAL_HELADOS_ROJO = 3; // helados: alerta roja (menos de 3)

/** Umbrales por defecto de cada sección (RN-02). */
export const UMBRALES_POR_DEFECTO = {
  bar: { umbralAlerta: UMBRAL_BAR, umbralCritico: null },
  helados: { umbralAlerta: UMBRAL_HELADOS_AMARILLO, umbralCritico: UMBRAL_HELADOS_ROJO },
} as const;

// Topes
export const CANTIDAD_MAXIMA = 9999; // inicial, entrada, vendida, conteo y umbrales (RN-10)
export const MONTO_MAXIMO = 2_147_483_647; // máximo de una columna INTEGER de Postgres
export const LONGITUD_NOMBRE_PRODUCTO = 160;
export const LONGITUD_CATEGORIA = 40;
export const LONGITUD_NOMBRE_TURNO = 40;
export const LONGITUD_ENCARGADO = 80;
export const LONGITUD_NUMERO_FACTURA = 40; // opcional F6
export const LONGITUD_PROVEEDOR = 120; // opcional F6

export const ZONA_HORARIA = "America/Bogota";
export const LIMITE_LISTADO = 200;
