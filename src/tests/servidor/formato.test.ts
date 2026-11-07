import { describe, expect, it } from "vitest";
import { formatearFecha, formatearFechaHora, formatearPesos } from "@/lib/formato";

// Intl separa el símbolo con un espacio duro (U+00A0); se normaliza para comparar.
const normal = (texto: string) => texto.replace(/ /g, " ");

describe("formatearPesos", () => {
  it("pesos sin decimales con separador de miles", () => {
    expect(normal(formatearPesos(107000))).toBe("$ 107.000");
    expect(normal(formatearPesos(0))).toBe("$ 0");
  });
  it("negativos con signo menos", () => {
    expect(normal(formatearPesos(-20000))).toBe("-$ 20.000");
  });
});

describe("formatearFecha", () => {
  it("no corre el día por la zona horaria", () => {
    expect(formatearFecha("2026-11-06")).toBe("6 de noviembre de 2026");
    expect(formatearFecha("2026-01-01")).toBe("1 de enero de 2026");
  });
  it("devuelve el texto tal cual si no es 'YYYY-MM-DD'", () => {
    expect(formatearFecha("ayer")).toBe("ayer");
  });
});

describe("formatearFechaHora", () => {
  it("muestra la hora de Bogotá (UTC−5)", () => {
    // 03:30 UTC del 7 de noviembre = 10:30 p. m. del 6 en Bogotá.
    const texto = normal(formatearFechaHora("2026-11-07 03:30:00+00"));
    expect(texto).toContain("6/11/2026");
    expect(texto).toContain("10:30");
  });
});
