import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { asignarMock, clientQueryMock, createUserSessionMock, destinoMock, getSupabasePoolMock, hashPasswordMock, releaseMock } = vi.hoisted(() => ({
  asignarMock: vi.fn(),
  clientQueryMock: vi.fn(),
  createUserSessionMock: vi.fn(),
  destinoMock: vi.fn(),
  getSupabasePoolMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/lib/acceso-inventario", () => ({ asignarAccesoInventario: asignarMock }));
vi.mock("@/lib/auth", () => ({ createUserSession: createUserSessionMock }));
vi.mock("@/lib/auth/sesion", () => ({ destinoTrasLogin: destinoMock }));
vi.mock("@/lib/password", () => ({ hashPassword: hashPasswordMock }));
vi.mock("@/lib/supabase-db", () => ({ getSupabasePool: getSupabasePoolMock }));

function request(body: unknown) {
  return new Request("http://localhost/api/auth/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const insercionUsuario = () =>
  clientQueryMock.mock.calls.find(([sql]) => String(sql).includes("insert into public.users")) as [string, unknown[]] | undefined;

describe("/api/auth/registro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabasePoolMock.mockReturnValue({ connect: async () => ({ query: clientQueryMock, release: releaseMock }) });
    clientQueryMock.mockResolvedValue({ rowCount: 1 });
    asignarMock.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hash");
    createUserSessionMock.mockResolvedValue({ id: "u1", email: "nueva@correo.com", name: "Nueva", role: "user" });
    destinoMock.mockResolvedValue("/inventario");
  });

  it("crea la cuenta con rol 'user' (aunque pida 'admin') y la deja como encargado del inventario", async () => {
    const response = await POST(request({ name: " Nueva ", email: " Nueva@Correo.com ", password: "secreta-123", role: "admin" }));

    expect(response.status).toBe(201);
    const [sql, valores] = insercionUsuario()!;
    expect(sql).toContain("'user'");
    expect(sql).not.toContain("$4");
    expect(valores).toEqual(["Nueva", "nueva@correo.com", "hash"]);
    expect(asignarMock).toHaveBeenCalledWith(expect.anything(), "nueva@correo.com", "encargado");
    expect(clientQueryMock).toHaveBeenCalledWith("commit");
    expect(releaseMock).toHaveBeenCalled();
    expect(await response.json()).toEqual({ success: true, sesion: true, destino: "/inventario" });
  });

  it("rechaza datos inválidos sin tocar la base", async () => {
    for (const cuerpo of [
      { name: "", email: "a@b.co", password: "secreta-123" },
      { name: "X", email: "no-es-correo", password: "secreta-123" },
      { name: "X", email: "a@b.co", password: "corta" },
    ]) {
      expect((await POST(request(cuerpo))).status).toBe(400);
    }
    expect((await POST(request("{no es json"))).status).toBe(400);
    expect(clientQueryMock).not.toHaveBeenCalled();
  });

  it("correo ya registrado → 409, sin permiso ni sesión", async () => {
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("insert into public.users")) throw Object.assign(new Error("duplicado"), { code: "23505" });
      return { rowCount: 0 };
    });
    const response = await POST(request({ name: "X", email: "ya@existe.com", password: "secreta-123" }));
    expect(response.status).toBe(409);
    expect(clientQueryMock).toHaveBeenCalledWith("rollback");
    expect(asignarMock).not.toHaveBeenCalled();
    expect(createUserSessionMock).not.toHaveBeenCalled();
  });
});
