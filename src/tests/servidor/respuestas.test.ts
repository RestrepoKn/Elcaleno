import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  conManejoDeErrores,
  leerCuerpo,
  responderError,
  responderOk,
  traducirErrorPostgres,
} from "@/lib/http/respuestas";
import { ErrorDeNegocio } from "@/lib/reglas/errores";

const errorPg = (code: string, constraint?: string) =>
  Object.assign(new Error("pg"), { code, constraint });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("responderOk", () => {
  it("envuelve los datos con ok: true, el estado indicado y no-store", async () => {
    const respuesta = responderOk({ id: "x" }, 201);
    expect(respuesta.status).toBe(201);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ ok: true, datos: { id: "x" } });
  });
});

describe("responderError", () => {
  it("ErrorDeNegocio usa ESTADO_HTTP, su mensaje y sus detalles", async () => {
    const respuesta = responderError(new ErrorDeNegocio("TURNO_INCOMPLETO", undefined, { filas: 2 }));
    expect(respuesta.status).toBe(409);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({
      ok: false,
      error: {
        codigo: "TURNO_INCOMPLETO",
        mensaje: "Faltan datos para continuar (conteos, facturas o pago).",
        detalles: { filas: 2 },
      },
    });
  });

  it("NO_AUTORIZADO da 401 y SIN_PERMISO da 403", () => {
    expect(responderError(new ErrorDeNegocio("NO_AUTORIZADO")).status).toBe(401);
    expect(responderError(new ErrorDeNegocio("SIN_PERMISO")).status).toBe(403);
  });

  it("ZodError da 400 DATOS_INVALIDOS con los errores por campo", async () => {
    const resultado = z.object({ nombre: z.string() }).safeParse({ nombre: 3 });
    expect(resultado.success).toBe(false);
    const respuesta = responderError(resultado.error);
    const cuerpo = await respuesta.json();
    expect(respuesta.status).toBe(400);
    expect(cuerpo.error.codigo).toBe("DATOS_INVALIDOS");
    expect(cuerpo.error.detalles.fieldErrors.nombre).toHaveLength(1);
  });

  it.each([
    ["23505", "ux_productos_nombre", "PRODUCTO_DUPLICADO", 409],
    ["23505", "ux_turnos_un_abierto", "TURNO_YA_ABIERTO", 409],
    ["23505", "ux_turnos_fecha_nombre", "TURNO_DUPLICADO", 409],
    ["23505", "ux_facturas_numero_producto", "FACTURA_DUPLICADA", 409],
    ["23503", "registros_turno_producto_id_fkey", "PRODUCTO_CON_REGISTROS", 409],
    ["23514", "registros_vendida_excede", "VENDIDO_EXCEDE_EXISTENCIA", 409],
    ["23514", "productos_valor_positivo", "DATOS_INVALIDOS", 400],
  ])("pg %s %s → %s", async (code, constraint, codigo, estado) => {
    const respuesta = responderError(errorPg(code, constraint));
    expect(respuesta.status).toBe(estado);
    expect((await respuesta.json()).error.codigo).toBe(codigo);
  });

  it("un error no previsto da 500 ERROR_INTERNO, sin detalles, y se registra en consola", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const respuesta = responderError(new Error("conexión rechazada: secreto"));
    const cuerpo = await respuesta.json();
    expect(respuesta.status).toBe(500);
    expect(cuerpo.error).toEqual({
      codigo: "ERROR_INTERNO",
      mensaje: "Ocurrió un error inesperado. Intente de nuevo.",
      detalles: null,
    });
    expect(JSON.stringify(cuerpo)).not.toContain("secreto");
    expect(consola).toHaveBeenCalledOnce();
  });

  it("un 23505 de una restricción desconocida no se disfraza: es ERROR_INTERNO", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(traducirErrorPostgres(errorPg("23505", "otra_restriccion"))).toBeNull();
    expect(responderError(errorPg("23505", "otra_restriccion")).status).toBe(500);
  });
});

describe("conManejoDeErrores", () => {
  it("devuelve la respuesta del handler y pasa sus argumentos", async () => {
    const handler = conManejoDeErrores(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params;
      return responderOk({ id });
    });
    const respuesta = await handler(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(await respuesta.json()).toEqual({ ok: true, datos: { id: "abc" } });
  });

  it("convierte un error lanzado en respuesta de error", async () => {
    const handler = conManejoDeErrores(async () => {
      throw new ErrorDeNegocio("TURNO_YA_ABIERTO");
    });
    const respuesta = await handler();
    expect(respuesta.status).toBe(409);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("leerCuerpo", () => {
  const esquema = z.object({ nombre: z.string().trim().min(1) });
  const peticion = (cuerpo: string) =>
    new Request("http://localhost/x", { method: "POST", body: cuerpo });

  it("devuelve el cuerpo validado", async () => {
    expect(await leerCuerpo(peticion('{"nombre":" Noche "}'), esquema)).toEqual({ nombre: "Noche" });
  });

  it("JSON inválido → DATOS_INVALIDOS", async () => {
    await expect(leerCuerpo(peticion("{no es json"), esquema)).rejects.toMatchObject({
      codigo: "DATOS_INVALIDOS",
    });
  });

  it("cuerpo que no cumple el esquema → ZodError", async () => {
    await expect(leerCuerpo(peticion('{"nombre":" "}'), esquema)).rejects.toBeInstanceOf(z.ZodError);
  });
});
