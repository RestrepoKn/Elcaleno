import { describe, expect, it } from "vitest";
import {
  UMBRAL_BAR,
  UMBRAL_HELADOS_AMARILLO,
  UMBRAL_HELADOS_ROJO,
} from "@/lib/config/inventario";
import { nivelAlerta } from "@/lib/reglas/alertas";

const bar = (inventario: number) => nivelAlerta(inventario, UMBRAL_BAR, null);
const helados = (inventario: number) =>
  nivelAlerta(inventario, UMBRAL_HELADOS_AMARILLO, UMBRAL_HELADOS_ROJO);

describe("nivelAlerta en el bar (umbral 6, sin crítico)", () => {
  it("T-19 inventario 6 → ninguna", () => {
    expect(bar(6)).toBe("ninguna");
  });
  it("T-20 inventario 5 → reponer", () => {
    expect(bar(5)).toBe("reponer");
  });
  it("T-21 inventario 0 → reponer", () => {
    expect(bar(0)).toBe("reponer");
  });
});

describe("nivelAlerta en helados (umbrales 5 y 3)", () => {
  it("T-22 inventario 5 → ninguna", () => {
    expect(helados(5)).toBe("ninguna");
  });
  it("T-23 inventario 4 → amarilla", () => {
    expect(helados(4)).toBe("amarilla");
  });
  it("T-24 inventario 3 → amarilla", () => {
    expect(helados(3)).toBe("amarilla");
  });
  it("T-25 inventario 2 → roja", () => {
    expect(helados(2)).toBe("roja");
  });
  it("T-26 inventario 0 → roja", () => {
    expect(helados(0)).toBe("roja");
  });
});
