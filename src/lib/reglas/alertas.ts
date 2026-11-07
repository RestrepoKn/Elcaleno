// Alertas de reposición: RN-06 (plan, sección 8). Umbrales estrictos.

export type NivelAlerta = "ninguna" | "reponer" | "amarilla" | "roja";

export const ETIQUETA_ALERTA: Record<NivelAlerta, string> = {
  ninguna: "Sin alerta",
  reponer: "Por reponer",
  amarilla: "Alerta amarilla",
  roja: "Alerta roja",
};

/**
 * Bar (sin umbral crítico): por debajo del umbral → 'reponer'.
 * Helados: por debajo del crítico → 'roja'; por debajo del de alerta → 'amarilla'.
 */
export function nivelAlerta(
  inventario: number,
  umbralAlerta: number,
  umbralCritico: number | null,
): NivelAlerta {
  if (umbralCritico !== null && inventario < umbralCritico) return "roja";
  if (inventario < umbralAlerta) return umbralCritico === null ? "reponer" : "amarilla";
  return "ninguna";
}
