import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

const peticion = (ruta: string, conCookie = false) =>
  new NextRequest(`http://localhost${ruta}`, {
    headers: conCookie ? { cookie: "elcaleno_session=token" } : {},
  });

describe("proxy del inventario", () => {
  it("conserva las rutas existentes y agrega las del inventario", () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        "/dashboard/:path*",
        "/notes/:path*",
        "/status/:path*",
        "/inventario/:path*",
        "/api/inventario/:path*",
      ]),
    );
  });

  it("API del inventario sin sesión: 401 JSON NO_AUTORIZADO con no-store", async () => {
    const respuesta = proxy(peticion("/api/inventario/sesion"));
    expect(respuesta.status).toBe(401);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect((await respuesta.json()).error.codigo).toBe("NO_AUTORIZADO");
  });

  it("páginas sin sesión: redirigen a /login, como antes", () => {
    for (const ruta of ["/inventario", "/inventario/turno", "/dashboard"]) {
      const respuesta = proxy(peticion(ruta));
      expect(respuesta.status).toBe(307);
      expect(new URL(respuesta.headers.get("location") ?? "").pathname).toBe("/login");
    }
  });

  it("con cookie deja pasar (la validación real es exigirSesion)", () => {
    const respuesta = proxy(peticion("/api/inventario/sesion", true));
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });
});
