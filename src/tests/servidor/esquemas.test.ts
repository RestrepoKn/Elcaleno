import { describe, expect, it } from "vitest";
import {
  esquemaCambioRegistro,
  esquemaCambiosProducto,
  esquemaCocina,
  esquemaFactura,
  esquemaFiltrosInventario,
  esquemaFinanzas,
  esquemaProducto,
  esquemaTurno,
} from "@/lib/validacion/esquemas";

const producto = { nombre: "Gaseosa", seccion: "bar", categoria: "Bebida", valorUnitario: 3500 };

describe("esquemaProducto", () => {
  it("acepta un producto sin umbrales y recorta el nombre", () => {
    expect(esquemaProducto.parse({ ...producto, nombre: "  Gaseosa  " }).nombre).toBe("Gaseosa");
  });
  it("rechaza valor 0, decimales, sección desconocida y nombre vacío", () => {
    expect(esquemaProducto.safeParse({ ...producto, valorUnitario: 0 }).success).toBe(false);
    expect(esquemaProducto.safeParse({ ...producto, valorUnitario: 3500.5 }).success).toBe(false);
    expect(esquemaProducto.safeParse({ ...producto, seccion: "cocina" }).success).toBe(false);
    expect(esquemaProducto.safeParse({ ...producto, nombre: "   " }).success).toBe(false);
  });
  it("acepta umbrales de helados y crítico null en el bar", () => {
    expect(
      esquemaProducto.safeParse({ ...producto, seccion: "helados", umbralAlerta: 5, umbralCritico: 3 })
        .success,
    ).toBe(true);
    expect(esquemaProducto.safeParse({ ...producto, umbralCritico: null }).success).toBe(true);
  });
});

describe("esquemaCambiosProducto", () => {
  it("exige al menos un campo", () => {
    expect(esquemaCambiosProducto.safeParse({}).success).toBe(false);
    expect(esquemaCambiosProducto.safeParse({ activo: false }).success).toBe(true);
  });
  it("no permite cambiar la sección", () => {
    expect(esquemaCambiosProducto.safeParse({ seccion: "helados" }).success).toBe(false);
    expect(esquemaCambiosProducto.safeParse({ valorUnitario: 4000, seccion: "bar" }).success).toBe(false);
  });
});

describe("esquemaTurno", () => {
  it("acepta sin fecha y valida la fecha cuando viene", () => {
    expect(esquemaTurno.safeParse({ nombre: "Noche", encargado: "Carlos" }).success).toBe(true);
    expect(esquemaTurno.safeParse({ nombre: "Noche", encargado: "Carlos", fecha: "2026-11-06" }).success).toBe(true);
    expect(esquemaTurno.safeParse({ nombre: "Noche", encargado: "Carlos", fecha: "2026-02-30" }).success).toBe(false);
    expect(esquemaTurno.safeParse({ nombre: "Noche", encargado: "Carlos", fecha: "06/11/2026" }).success).toBe(false);
  });
  it("limita el nombre a 40 caracteres y el encargado a 80", () => {
    expect(esquemaTurno.safeParse({ nombre: "x".repeat(41), encargado: "Carlos" }).success).toBe(false);
    expect(esquemaTurno.safeParse({ nombre: "Noche", encargado: "x".repeat(81) }).success).toBe(false);
  });
});

describe("esquemaCambioRegistro", () => {
  it("exige al menos un campo y enteros de 0 a 9999", () => {
    expect(esquemaCambioRegistro.safeParse({}).success).toBe(false);
    expect(esquemaCambioRegistro.safeParse({ contado: 0 }).success).toBe(true);
    expect(esquemaCambioRegistro.safeParse({ vendida: -1 }).success).toBe(false);
    expect(esquemaCambioRegistro.safeParse({ entrada: 10000 }).success).toBe(false);
    expect(esquemaCambioRegistro.safeParse({ vendida: 1.5 }).success).toBe(false);
  });
});

describe("esquemaFinanzas", () => {
  it("acepta ceros y rechaza negativos o decimales", () => {
    expect(esquemaFinanzas.safeParse({ facturasEfectivo: 0, pagoEncargado: 0 }).success).toBe(true);
    expect(esquemaFinanzas.safeParse({ facturasEfectivo: -1, pagoEncargado: 0 }).success).toBe(false);
    expect(esquemaFinanzas.safeParse({ facturasEfectivo: 0, pagoEncargado: 10.5 }).success).toBe(false);
    expect(esquemaFinanzas.safeParse({ facturasEfectivo: 0 }).success).toBe(false);
  });
});

describe("esquemaFiltrosInventario", () => {
  it("convierte soloPorReponer de texto a booleano", () => {
    expect(esquemaFiltrosInventario.parse({ soloPorReponer: "true" }).soloPorReponer).toBe(true);
    expect(esquemaFiltrosInventario.parse({ soloPorReponer: "0" }).soloPorReponer).toBe(false);
    expect(esquemaFiltrosInventario.parse({}).soloPorReponer).toBeUndefined();
    expect(esquemaFiltrosInventario.safeParse({ seccion: "cocina" }).success).toBe(false);
  });
});

describe("opcionales", () => {
  it("cocina: la salida no supera la existencia inicial", () => {
    const base = { producto: "Arroz", fecha: "2026-11-06", existenciaInicial: 10 };
    expect(esquemaCocina.safeParse({ ...base, salida: 10 }).success).toBe(true);
    expect(esquemaCocina.safeParse({ ...base, salida: 11 }).success).toBe(false);
  });
  it("factura: productoId debe ser uuid y el turno es opcional", () => {
    const base = {
      numero: "F-1",
      proveedor: "Postobón",
      fecha: "2026-11-06",
      valorUnitario: 2000,
    };
    expect(
      esquemaFactura.safeParse({ ...base, productoId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" }).success,
    ).toBe(true);
    expect(esquemaFactura.safeParse({ ...base, productoId: "no-es-uuid" }).success).toBe(false);
  });
});
