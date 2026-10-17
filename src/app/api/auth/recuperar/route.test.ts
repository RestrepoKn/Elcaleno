import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const {
  buscarUsuarioPorEmailMock,
  enviarCorreoMock,
  prepararSolicitudRecuperacionMock,
} = vi.hoisted(() => ({
  buscarUsuarioPorEmailMock: vi.fn(),
  enviarCorreoMock: vi.fn(),
  prepararSolicitudRecuperacionMock: vi.fn(),
}));

vi.mock("@/lib/correo", () => ({ enviarCorreo: enviarCorreoMock }));
vi.mock("@/lib/dataService", () => ({
  buscarUsuarioPorEmail: buscarUsuarioPorEmailMock,
  prepararSolicitudRecuperacion: prepararSolicitudRecuperacionMock,
}));
vi.mock("@/lib/tokenRecuperacion", () => ({
  calcularHashToken: vi.fn(() => "hash-token"),
  generarToken: vi.fn(() => "a".repeat(64)),
}));
vi.mock("@/lib/urlBase", () => ({ obtenerUrlBase: vi.fn(() => "https://elcaleno.example") }));

function solicitud(cuerpo: unknown) {
  return new Request("http://localhost/api/auth/recuperar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

describe("/api/auth/recuperar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarUsuarioPorEmailMock.mockResolvedValue({ id: "usuario-1", email: "persona@example.com" });
    prepararSolicitudRecuperacionMock.mockResolvedValue(true);
    enviarCorreoMock.mockResolvedValue({ ok: true, id: "correo-1" });
  });

  it("valida el correo", async () => {
    const respuesta = await POST(solicitud({ email: "invalido" }));
    expect(respuesta.status).toBe(400);
    expect(buscarUsuarioPorEmailMock).not.toHaveBeenCalled();
  });

  it("responde con el mismo mensaje si no existe el usuario", async () => {
    buscarUsuarioPorEmailMock.mockResolvedValue(null);

    const respuesta = await POST(solicitud({ email: "persona@example.com" }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.message).toBe("Si el correo está registrado, recibirás un enlace para restablecer la contraseña.");
    expect(enviarCorreoMock).not.toHaveBeenCalled();
  });

  it("no envía más de tres solicitudes en quince minutos", async () => {
    prepararSolicitudRecuperacionMock.mockResolvedValue(false);

    const respuesta = await POST(solicitud({ email: "persona@example.com" }));

    expect(respuesta.status).toBe(200);
    expect(enviarCorreoMock).not.toHaveBeenCalled();
  });

  it("crea el token y responde de forma genérica aunque el envío falle", async () => {
    enviarCorreoMock.mockResolvedValue({ ok: false, error: "Error del proveedor" });

    const respuesta = await POST(solicitud({ email: "persona@example.com" }));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.message).toBe("Si el correo está registrado, recibirás un enlace para restablecer la contraseña.");
    expect(prepararSolicitudRecuperacionMock).toHaveBeenCalledWith("usuario-1", "hash-token");
    expect(enviarCorreoMock).toHaveBeenCalledWith(expect.objectContaining({
      para: "persona@example.com",
      asunto: "Restablecer contraseña",
      html: expect.stringContaining("https://elcaleno.example/restablecer-contrasena?token=" + "a".repeat(64)),
    }));
  });
});
