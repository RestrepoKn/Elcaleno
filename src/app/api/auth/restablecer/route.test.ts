import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { buscarTokenVigentePorHashMock, completarRestablecimientoMock, hashPasswordMock } = vi.hoisted(() => ({
  buscarTokenVigentePorHashMock: vi.fn(),
  completarRestablecimientoMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock("@/lib/dataService", () => ({
  buscarTokenVigentePorHash: buscarTokenVigentePorHashMock,
  completarRestablecimiento: completarRestablecimientoMock,
}));
vi.mock("@/lib/password", () => ({ hashPassword: hashPasswordMock }));
vi.mock("@/lib/tokenRecuperacion", () => ({ calcularHashToken: vi.fn(() => "hash-token") }));

function solicitud(cuerpo: unknown) {
  return new Request("http://localhost/api/auth/restablecer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

describe("/api/auth/restablecer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarTokenVigentePorHashMock.mockResolvedValue({ id: "token-1", usuarioId: "usuario-1" });
    completarRestablecimientoMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue("scrypt-hash");
  });

  it("rechaza token y confirmación inválidos", async () => {
    const respuesta = await POST(solicitud({
      token: "corto",
      contrasena: "clave-segura",
      confirmacion: "otra-clave",
    }));

    expect(respuesta.status).toBe(400);
    expect(buscarTokenVigentePorHashMock).not.toHaveBeenCalled();
  });

  it("rechaza un enlace inexistente o vencido", async () => {
    buscarTokenVigentePorHashMock.mockResolvedValue(null);

    const respuesta = await POST(solicitud({
      token: "a".repeat(64),
      contrasena: "clave-segura",
      confirmacion: "clave-segura",
    }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(400);
    expect(cuerpo.error).toBe("El enlace no es válido o ya venció.");
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });

  it("restablece contraseña sin iniciar sesión", async () => {
    const respuesta = await POST(solicitud({
      token: "a".repeat(64),
      contrasena: "clave-segura",
      confirmacion: "clave-segura",
    }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.success).toBe(true);
    expect(hashPasswordMock).toHaveBeenCalledWith("clave-segura");
    expect(completarRestablecimientoMock).toHaveBeenCalledWith(
      { id: "token-1", usuarioId: "usuario-1" },
      "scrypt-hash",
    );
  });
});
