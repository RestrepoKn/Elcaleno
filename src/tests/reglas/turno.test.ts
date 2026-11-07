import { describe, expect, it } from "vitest";
import {
  esEditable,
  puedeCerrar,
  puedeDevolver,
  puedeEntregar,
  resultadoNeto,
  validarFinanzas,
  validarTurno,
  valorVentaTotal,
} from "@/lib/reglas/turno";
import { esperarCodigo } from "./ayudas";

const turnoValido = { nombre: "Noche", encargado: "Carlos", fecha: "2026-11-06" };

describe("valorVentaTotal y resultadoNeto (RN-07)", () => {
  it("T-34 valorVentaTotal [63000, 20000, 24000] → 107000", () => {
    expect(valorVentaTotal([63000, 20000, 24000])).toBe(107000);
  });
  it("T-35 valorVentaTotal [] → 0", () => {
    expect(valorVentaTotal([])).toBe(0);
  });
  it("T-36 resultadoNeto 107000 − 30000 − 40000 → 37000", () => {
    expect(resultadoNeto(107000, 30000, 40000)).toBe(37000);
  });
  it("T-37 resultadoNeto 50000 − 30000 − 40000 → −20000 (negativo permitido)", () => {
    expect(resultadoNeto(50000, 30000, 40000)).toBe(-20000);
  });
  it("T-38 resultadoNeto 0, 0, 0 → 0", () => {
    expect(resultadoNeto(0, 0, 0)).toBe(0);
  });
});

describe("validarTurno", () => {
  it('T-39 nombre " " → DATOS_INVALIDOS', () => {
    esperarCodigo(() => validarTurno({ ...turnoValido, nombre: " " }), "DATOS_INVALIDOS");
  });
  it('T-40 encargado " " → DATOS_INVALIDOS', () => {
    esperarCodigo(() => validarTurno({ ...turnoValido, encargado: " " }), "DATOS_INVALIDOS");
  });
  it("T-41 \"Noche\", \"Carlos\", '2026-11-06' → sin error", () => {
    expect(() => validarTurno(turnoValido)).not.toThrow();
  });
});

describe("validarFinanzas", () => {
  it("T-42 pago −1 → DATOS_INVALIDOS", () => {
    esperarCodigo(
      () => validarFinanzas({ facturasEfectivo: 0, pagoEncargado: -1 }),
      "DATOS_INVALIDOS",
    );
  });
  it("T-43 facturas −1 → DATOS_INVALIDOS", () => {
    esperarCodigo(
      () => validarFinanzas({ facturasEfectivo: -1, pagoEncargado: 0 }),
      "DATOS_INVALIDOS",
    );
  });
  it("T-44 facturas 0, pago 0 → sin error", () => {
    expect(() => validarFinanzas({ facturasEfectivo: 0, pagoEncargado: 0 })).not.toThrow();
  });
});

describe("flujo del turno (RN-12)", () => {
  it("T-50 puedeEntregar 'abierto', 0 filas sin conteo → true", () => {
    expect(puedeEntregar("abierto", 0)).toBe(true);
  });
  it("T-51 puedeEntregar 'abierto', 2 filas sin conteo → false", () => {
    expect(puedeEntregar("abierto", 2)).toBe(false);
  });
  it("T-52 puedeEntregar 'en_revision', 0 → false", () => {
    expect(puedeEntregar("en_revision", 0)).toBe(false);
  });
  it("T-53 puedeCerrar 'en_revision', finanzas registradas → true", () => {
    expect(puedeCerrar("en_revision", true)).toBe(true);
  });
  it("T-54 puedeCerrar 'en_revision', sin finanzas → false", () => {
    expect(puedeCerrar("en_revision", false)).toBe(false);
  });
  it("T-55 puedeCerrar 'abierto', finanzas registradas → false", () => {
    expect(puedeCerrar("abierto", true)).toBe(false);
  });
  it("T-56 puedeDevolver 'en_revision', sin turno posterior → true", () => {
    expect(puedeDevolver("en_revision", false)).toBe(true);
  });
  it("T-57 puedeDevolver 'en_revision', con turno posterior → false", () => {
    expect(puedeDevolver("en_revision", true)).toBe(false);
  });
  it("T-58 puedeDevolver 'cerrado', sin turno posterior → false", () => {
    expect(puedeDevolver("cerrado", false)).toBe(false);
  });
  it("T-59 esEditable 'abierto' → true", () => {
    expect(esEditable("abierto")).toBe(true);
  });
  it("T-60 esEditable 'en_revision' → false", () => {
    expect(esEditable("en_revision")).toBe(false);
  });
  it("T-61 esEditable 'cerrado' → false", () => {
    expect(esEditable("cerrado")).toBe(false);
  });
});
