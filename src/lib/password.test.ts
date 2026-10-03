import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies a password without storing it in plain text", async () => {
    const password = "demo1234";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toContain(password);
    expect(await verifyPassword(password, passwordHash)).toBe(true);
    expect(await verifyPassword("incorrecta", passwordHash)).toBe(false);
  });

  it("rejects malformed password hashes", async () => {
    await expect(verifyPassword("demo1234", "not-a-hash")).resolves.toBe(false);
  });
});