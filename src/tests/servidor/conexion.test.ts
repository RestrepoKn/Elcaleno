import { describe, expect, it } from "vitest";
import { types } from "pg";
import { limpiarUrlConexion, tiposInventario } from "@/lib/db/conexion";

// Importar el módulo no abre conexión: el pool se crea al primer uso.
describe("parsers del pool del inventario", () => {
  const parser = (oid: number) => tiposInventario.getTypeParser(oid as never, "text") as (v: string) => unknown;

  it("DATE, TIMESTAMP y TIMESTAMPTZ se quedan como texto", () => {
    expect(parser(1082)("2026-11-06")).toBe("2026-11-06");
    expect(parser(1114)("2026-11-06 10:00:00")).toBe("2026-11-06 10:00:00");
    expect(parser(1184)("2026-11-06 10:00:00+00")).toBe("2026-11-06 10:00:00+00");
  });

  it("BIGINT (COUNT, SUM, BIGSERIAL) pasa a número", () => {
    expect(parser(20)("107000")).toBe(107000);
  });

  it("no altera los parsers globales de pg (los usa el login)", () => {
    const fechaGlobal = (types.getTypeParser(1184, "text") as (v: string) => unknown)("2026-11-06 10:00:00+00");
    expect(fechaGlobal).toBeInstanceOf(Date);
    expect(typeof (types.getTypeParser(20, "text") as (v: string) => unknown)("5")).toBe("string");
  });
});

describe("limpiarUrlConexion", () => {
  it("quita sslmode y sslrootcert y conserva el resto", () => {
    const limpia = limpiarUrlConexion(
      "postgres://u:p@host:5432/postgres?sslmode=require&sslrootcert=x&supa=base-pooler.x",
    );
    expect(limpia).not.toContain("sslmode");
    expect(limpia).not.toContain("sslrootcert");
    expect(limpia).toContain("supa=base-pooler.x");
  });
});
