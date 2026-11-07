import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, rolDeCorreoMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  rolDeCorreoMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/datos/acceso", () => ({ rolDeCorreo: rolDeCorreoMock }));

import { exigirRol, exigirSesion, obtenerSesion, obtenerUsuario } from "@/lib/auth/sesion";

const usuarioLogin = (email: string) => ({ id: "u1", email, name: "Usuario", role: "user" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sesión del inventario", () => {
  it("sin sesión: obtenerUsuario es null y exigirSesion lanza NO_AUTORIZADO", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await obtenerSesion()).toBeNull();
    expect(await obtenerUsuario()).toBeNull();
    await expect(exigirSesion()).rejects.toMatchObject({ codigo: "NO_AUTORIZADO" });
    expect(rolDeCorreoMock).not.toHaveBeenCalled();
  });

  it("correo sin rol en acceso: no entra", async () => {
    getCurrentUserMock.mockResolvedValue(usuarioLogin("nadie@correo.com"));
    rolDeCorreoMock.mockResolvedValue(null);
    expect(await obtenerUsuario()).toBeNull();
    await expect(exigirSesion()).rejects.toMatchObject({ codigo: "NO_AUTORIZADO" });
  });

  it("normaliza el correo y devuelve el rol", async () => {
    getCurrentUserMock.mockResolvedValue(usuarioLogin(" Admin@Correo.com "));
    rolDeCorreoMock.mockResolvedValue("administrador");
    expect(await exigirSesion()).toEqual({ email: "admin@correo.com", rol: "administrador" });
    expect(rolDeCorreoMock).toHaveBeenCalledWith("admin@correo.com");
  });

  it("encargado: exigirRol('administrador') lanza SIN_PERMISO; exigirRol('encargado') pasa", async () => {
    getCurrentUserMock.mockResolvedValue(usuarioLogin("bar@correo.com"));
    rolDeCorreoMock.mockResolvedValue("encargado");
    await expect(exigirRol("administrador")).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    await expect(exigirRol("encargado")).resolves.toMatchObject({ rol: "encargado" });
  });

  it("el administrador alcanza también las acciones del encargado", async () => {
    getCurrentUserMock.mockResolvedValue(usuarioLogin("admin@correo.com"));
    rolDeCorreoMock.mockResolvedValue("administrador");
    await expect(exigirRol("encargado")).resolves.toMatchObject({ rol: "administrador" });
  });
});

describe("destino después del login", () => {
  it("con rol en acceso va al inventario; sin rol, al panel", async () => {
    const { destinoTrasLogin } = await import("@/lib/auth/sesion");
    rolDeCorreoMock.mockResolvedValueOnce("encargado");
    expect(await destinoTrasLogin("bar@correo.com")).toBe("/inventario");
    rolDeCorreoMock.mockResolvedValueOnce(null);
    expect(await destinoTrasLogin("otro@correo.com")).toBe("/dashboard");
  });

  it("si la consulta del rol falla, el login no se bloquea: va al panel", async () => {
    const { destinoTrasLogin } = await import("@/lib/auth/sesion");
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    rolDeCorreoMock.mockRejectedValueOnce(new Error("sin conexión"));
    expect(await destinoTrasLogin("bar@correo.com")).toBe("/dashboard");
    consola.mockRestore();
  });
});
