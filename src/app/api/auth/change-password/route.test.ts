import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getCurrentUserMock, getSupabasePoolMock, hashPasswordMock, queryMock, verifyPasswordMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getSupabasePoolMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  queryMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/password", () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));
vi.mock("@/lib/supabase-db", () => ({ getSupabasePool: getSupabasePoolMock }));

function request(body: unknown) {
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/auth/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: "user-id", email: "user@example.com", name: "User", role: "user" });
    getSupabasePoolMock.mockReturnValue({ query: queryMock });
    hashPasswordMock.mockResolvedValue("new-hash");
    verifyPasswordMock.mockResolvedValue(true);
  });

  it("requires an active session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(request({ currentPassword: "old-password", newPassword: "new-password" }));

    expect(response.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("does not update when the current password is incorrect", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ passwordHash: "old-hash" }] });
    verifyPasswordMock.mockResolvedValue(false);

    const response = await POST(request({ currentPassword: "wrong-password", newPassword: "new-password" }));

    expect(response.status).toBe(400);
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("hashes and replaces the password after verifying the current one", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ passwordHash: "old-hash" }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await POST(request({ currentPassword: "old-password", newPassword: "new-password" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyPasswordMock).toHaveBeenCalledWith("old-password", "old-hash");
    expect(hashPasswordMock).toHaveBeenCalledWith("new-password");
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("password_hash = $3"),
      ["user-id", "new-hash", "old-hash"],
    );
  });

  it("rejects reusing the current password", async () => {
    const response = await POST(request({ currentPassword: "same-password", newPassword: "same-password" }));

    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
