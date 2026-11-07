import { describe, expect, it } from "vitest";
import { validarProducto } from "@/lib/reglas/producto";
import { esperarCodigo } from "./ayudas";

const gaseosa = {
  nombre: "Gaseosa",
  seccion: "bar" as const,
  categoria: "Bebida",
  valorUnitario: 3500,
  umbralAlerta: 6,
  umbralCritico: null,
};

const helado = {
  nombre: "Helado de vainilla",
  seccion: "helados" as const,
  categoria: "Helado",
  valorUnitario: 4000,
  umbralAlerta: 5,
  umbralCritico: 3,
};

describe("validarProducto (RN-01, RN-02)", () => {
  it("T-45 valor 0 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarProducto({ ...gaseosa, valorUnitario: 0 }), "DATOS_INVALIDOS");
  });
  it('T-46 nombre " " → DATOS_INVALIDOS', () => {
    esperarCodigo(() => validarProducto({ ...gaseosa, nombre: " " }), "DATOS_INVALIDOS");
  });
  it('T-47 "Gaseosa", bar, Bebida, 3500, umbral 6, crítico null → sin error', () => {
    expect(() => validarProducto(gaseosa)).not.toThrow();
  });
  it("T-48 helados, umbral 3, crítico 5 → DATOS_INVALIDOS (el crítico debe ser menor)", () => {
    esperarCodigo(
      () => validarProducto({ ...helado, umbralAlerta: 3, umbralCritico: 5 }),
      "DATOS_INVALIDOS",
    );
  });
  it("T-49 bar con crítico 3 → DATOS_INVALIDOS", () => {
    esperarCodigo(() => validarProducto({ ...gaseosa, umbralCritico: 3 }), "DATOS_INVALIDOS");
  });
});
