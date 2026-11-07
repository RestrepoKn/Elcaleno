import { describe, expect, it } from "vitest";
import {
  estadoConteo,
  faltante,
  inventarioFinalCalculado,
  inventarioReferencia,
  sobrante,
  totalVenta,
  validarConteo,
  validarMovimiento,
  valorACancelar,
} from "@/lib/reglas/registro";
import { esperarCodigo } from "./ayudas";

describe("inventarioFinalCalculado (RN-03)", () => {
  it("T-01 inicial 24, entrada 12, vendida 18 → 18", () => {
    expect(inventarioFinalCalculado(24, 12, 18)).toBe(18);
  });
  it("T-02 10, 0, 10 → 0", () => {
    expect(inventarioFinalCalculado(10, 0, 10)).toBe(0);
  });
  it("T-03 5, 0, 0 → 5", () => {
    expect(inventarioFinalCalculado(5, 0, 0)).toBe(5);
  });
});

describe("totalVenta (RN-04)", () => {
  it("T-04 vendida 18, valor 3500 → 63000", () => {
    expect(totalVenta(18, 3500)).toBe(63000);
  });
  it("T-05 vendida 0, valor 3500 → 0", () => {
    expect(totalVenta(0, 3500)).toBe(0);
  });
});

describe("faltante, sobrante y valor a cancelar (RN-05)", () => {
  it("T-06 faltante: calculado 18, contado 16 → 2", () => {
    expect(faltante(18, 16)).toBe(2);
  });
  it("T-07 faltante: calculado 18, contado 18 → 0", () => {
    expect(faltante(18, 18)).toBe(0);
  });
  it("T-08 faltante: calculado 18, contado 20 → 0 (un sobrante no es faltante)", () => {
    expect(faltante(18, 20)).toBe(0);
  });
  it("T-09 sobrante: calculado 18, contado 20 → 2", () => {
    expect(sobrante(18, 20)).toBe(2);
  });
  it("T-10 sobrante: calculado 18, contado 16 → 0", () => {
    expect(sobrante(18, 16)).toBe(0);
  });
  it("T-11 valorACancelar: 2 unidades, valor 3500 → 7000", () => {
    expect(valorACancelar(2, 3500)).toBe(7000);
  });
  it("T-12 valorACancelar: 0 unidades, valor 3500 → 0", () => {
    expect(valorACancelar(0, 3500)).toBe(0);
  });
});

describe("estadoConteo (sección 5.3)", () => {
  it("T-13 calculado 18, contado null → sin_conteo", () => {
    expect(estadoConteo(18, null)).toBe("sin_conteo");
  });
  it("T-14 18, 18 → cuadra", () => {
    expect(estadoConteo(18, 18)).toBe("cuadra");
  });
  it("T-15 18, 16 → faltante", () => {
    expect(estadoConteo(18, 16)).toBe("faltante");
  });
  it("T-16 18, 20 → sobrante", () => {
    expect(estadoConteo(18, 20)).toBe("sobrante");
  });
});

describe("inventarioReferencia (RN-06)", () => {
  it("T-17 calculado 18, contado 16 → 16", () => {
    expect(inventarioReferencia(18, 16)).toBe(16);
  });
  it("T-18 calculado 18, contado null → 18", () => {
    expect(inventarioReferencia(18, null)).toBe(18);
  });
});

describe("validarMovimiento y validarConteo (RN-10)", () => {
  it("T-27 inicial 24, entrada 12, vendida 18 → sin error", () => {
    expect(() => validarMovimiento(24, 12, 18)).not.toThrow();
  });
  it("T-28 inicial 5, entrada 0, vendida 6 → VENDIDO_EXCEDE_EXISTENCIA", () => {
    esperarCodigo(() => validarMovimiento(5, 0, 6), "VENDIDO_EXCEDE_EXISTENCIA");
  });
  it("T-29 inicial 5, entrada 1, vendida 6 → sin error (inventario final 0)", () => {
    expect(() => validarMovimiento(5, 1, 6)).not.toThrow();
    expect(inventarioFinalCalculado(5, 1, 6)).toBe(0);
  });
  it("T-30 inicial 24, entrada −1, vendida 0 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarMovimiento(24, -1, 0), "DATOS_INVALIDOS");
  });
  it("T-31 inicial 24, entrada 0, vendida 1.5 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarMovimiento(24, 0, 1.5), "DATOS_INVALIDOS");
  });
  it("T-32 validarConteo −1 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarConteo(-1), "DATOS_INVALIDOS");
  });
  it("T-33 validarConteo 0 → sin error", () => {
    expect(() => validarConteo(0)).not.toThrow();
  });
});
