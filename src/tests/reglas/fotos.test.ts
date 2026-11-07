import { describe, expect, it } from "vitest";
import { FOTO_TAMANO_MAXIMO } from "@/lib/config/inventario";
import { extensionDeFoto, puedeBorrarFoto, puedeSubirFoto, validarArchivoFoto } from "@/lib/reglas/fotos";
import { esperarCodigo } from "./ayudas";

// Extensión M4 (fotos de facturas del turno). No están numeradas en el plan.
describe("permisos de las fotos del turno", () => {
  it("subir: abierto ambos; en revisión solo administrador; cerrado nadie", () => {
    expect(puedeSubirFoto("abierto", "encargado")).toBe(true);
    expect(puedeSubirFoto("abierto", "administrador")).toBe(true);
    expect(puedeSubirFoto("en_revision", "encargado")).toBe(false);
    expect(puedeSubirFoto("en_revision", "administrador")).toBe(true);
    expect(puedeSubirFoto("cerrado", "administrador")).toBe(false);
  });

  it("borrar: el encargado solo las suyas con el turno abierto; el administrador hasta antes de cerrar", () => {
    expect(puedeBorrarFoto("abierto", "encargado", true)).toBe(true);
    expect(puedeBorrarFoto("abierto", "encargado", false)).toBe(false);
    expect(puedeBorrarFoto("en_revision", "encargado", true)).toBe(false);
    expect(puedeBorrarFoto("en_revision", "administrador", false)).toBe(true);
    expect(puedeBorrarFoto("cerrado", "administrador", true)).toBe(false);
  });
});

describe("archivo de la foto", () => {
  it("acepta JPG, PNG y WEBP hasta el tamaño máximo", () => {
    expect(() => validarArchivoFoto("image/jpeg", 300_000)).not.toThrow();
    expect(() => validarArchivoFoto("image/png", FOTO_TAMANO_MAXIMO)).not.toThrow();
    expect(extensionDeFoto("image/webp")).toBe("webp");
  });

  it("rechaza otros tipos, archivos vacíos y los que superan el máximo", () => {
    esperarCodigo(() => validarArchivoFoto("application/pdf", 1000), "FOTO_INVALIDA");
    esperarCodigo(() => validarArchivoFoto("image/jpeg", 0), "FOTO_INVALIDA");
    esperarCodigo(() => validarArchivoFoto("image/jpeg", FOTO_TAMANO_MAXIMO + 1), "FOTO_INVALIDA");
  });
});
