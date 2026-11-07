import { describe, expect, it } from "vitest";
import { esCategoriaSugerencia, MENSAJE_MAXIMO, validarSugerencia } from "@/lib/reglas/sugerencias";
import { esperarCodigo } from "./ayudas";

// Extensión M5 (buzón de sugerencias). No están numeradas en el plan.
describe("buzón de sugerencias", () => {
  it("acepta las cuatro categorías y un mensaje normal", () => {
    for (const categoria of ["sugerencia", "problema", "pedido", "otro"]) {
      expect(esCategoriaSugerencia(categoria)).toBe(true);
      expect(() => validarSugerencia({ categoria, mensaje: "Falta hielo en la nevera del bar." })).not.toThrow();
    }
  });

  it("rechaza categorías desconocidas y mensajes vacíos, muy cortos o muy largos", () => {
    esperarCodigo(() => validarSugerencia({ categoria: "queja", mensaje: "Mensaje válido" }), "DATOS_INVALIDOS");
    esperarCodigo(() => validarSugerencia({ categoria: "otro", mensaje: "   " }), "DATOS_INVALIDOS");
    esperarCodigo(() => validarSugerencia({ categoria: "otro", mensaje: "ok" }), "DATOS_INVALIDOS");
    esperarCodigo(() => validarSugerencia({ categoria: "otro", mensaje: "x".repeat(MENSAJE_MAXIMO + 1) }), "DATOS_INVALIDOS");
  });
});
