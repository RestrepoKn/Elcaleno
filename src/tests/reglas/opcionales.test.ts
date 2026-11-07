import { describe, expect, it } from "vitest";
import { inventarioFinalCocina, validarCocina } from "@/lib/reglas/cocina";
import { detalleAumento, hayAumento } from "@/lib/reglas/precios";
import { esperarCodigo } from "./ayudas";

describe("hayAumento (RN-16, opcional F6)", () => {
  it("T-62 anterior 2000, nuevo 2500 → true", () => {
    expect(hayAumento(2000, 2500)).toBe(true);
  });
  it("T-63 anterior 2000, nuevo 2000 → false", () => {
    expect(hayAumento(2000, 2000)).toBe(false);
  });
  it("T-64 anterior 2000, nuevo 1800 → false", () => {
    expect(hayAumento(2000, 1800)).toBe(false);
  });
  it("T-65 anterior null, nuevo 2500 → false (primera factura del producto)", () => {
    expect(hayAumento(null, 2500)).toBe(false);
  });
});

describe("inventarioFinalCocina (RN-17, opcional F5)", () => {
  it("T-66 existencia 10, salida 4 → 6", () => {
    expect(inventarioFinalCocina(10, 4)).toBe(6);
  });
  it("T-67 existencia 10, salida 10 → 0", () => {
    expect(inventarioFinalCocina(10, 10)).toBe(0);
  });
  it("T-68 existencia 10, salida 11 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => inventarioFinalCocina(10, 11), "DATOS_INVALIDOS");
  });
});

// Complementarias (no numeradas en el plan).
describe("detalleAumento y validarCocina", () => {
  it("detalleAumento: diferencia del aumento, o null si no hubo", () => {
    expect(detalleAumento(2000, 2500)).toEqual({ anterior: 2000, nuevo: 2500, diferencia: 500 });
    expect(detalleAumento(2000, 1800)).toBeNull();
    expect(detalleAumento(null, 2500)).toBeNull();
  });
  it("validarCocina: producto vacío o fecha inválida → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarCocina({ producto: " ", fecha: "2026-11-07", existenciaInicial: 5, salida: 1 }), "DATOS_INVALIDOS");
    esperarCodigo(() => validarCocina({ producto: "Arroz", fecha: "2026-02-30", existenciaInicial: 5, salida: 1 }), "DATOS_INVALIDOS");
    expect(() => validarCocina({ producto: "Arroz", fecha: "2026-11-07", existenciaInicial: 5, salida: 1 })).not.toThrow();
  });
});
