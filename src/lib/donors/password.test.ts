import { describe, expect, it } from "vitest";
import { checkNewPassword, hashPassword, verifyPassword } from "./password";

describe("donor passwords", () => {
  it("hashes with a salt and verifies only the right password", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
  });

  it("treats a missing or malformed hash as no match", async () => {
    expect(await verifyPassword("anything at all", null)).toBe(false);
    expect(await verifyPassword("anything at all", "plain-text")).toBe(false);
  });

  it("checks new passwords", () => {
    expect(checkNewPassword("short", "short", "a@b.co")).toMatch(/at least 10/);
    expect(checkNewPassword("jane@example.com", "jane@example.com", "Jane@Example.com")).toMatch(/email/);
    expect(checkNewPassword("aaaaaaaaaaaa", "aaaaaaaaaaaa", "a@b.co")).toMatch(/repeated/);
    expect(checkNewPassword("a good long pass", "a good long pas", "a@b.co")).toMatch(/don't match/);
    expect(checkNewPassword("a good long pass", "a good long pass", "a@b.co")).toBeNull();
  });
});
