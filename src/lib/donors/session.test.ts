import { describe, expect, it } from "vitest";
import {
  codesMatch,
  createSession,
  hashSignInCode,
  hashToken,
  maskEmail,
  newLoginToken,
  newSignInCode,
  normaliseEmail,
  readSession,
  SESSION_TTL_MS,
} from "./session";

process.env.PAYLOAD_SECRET ??= "test-secret-for-donor-sessions";

describe("donor sessions", () => {
  it("round-trips a normalised email", () => {
    expect(readSession(createSession("  Ama@Example.TEST "))).toEqual({ email: "ama@example.test" });
  });

  it("rejects tampered, malformed and expired cookies", () => {
    const cookie = createSession("ama@example.test", 1_000);
    const [body, sig] = cookie.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "someone@else.test", x: 9e15 })).toString("base64url");
    expect(readSession(`${forged}.${sig}`, 2_000)).toBeNull();
    expect(readSession(`${body}.x${sig.slice(1)}`, 2_000)).toBeNull();
    expect(readSession("garbage", 2_000)).toBeNull();
    expect(readSession(cookie, 1_000 + SESSION_TTL_MS + 1)).toBeNull();
    expect(readSession(cookie, 2_000)).toEqual({ email: "ama@example.test" });
  });

  it("issues unguessable tokens and stores only their hash", () => {
    const a = newLoginToken();
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(newLoginToken().token).not.toBe(a.token);
    expect(normaliseEmail(" X@Y.Z ")).toBe("x@y.z");
  });
});

describe("sign-in codes", () => {
  it("are six digits and bound to the email", () => {
    const code = newSignInCode();
    expect(code).toMatch(/^\d{6}$/);
    const stored = hashSignInCode("Jane@Example.com", code);
    expect(codesMatch(stored, "jane@example.com", code)).toBe(true);
    expect(codesMatch(stored, "other@example.com", code)).toBe(false);
    expect(codesMatch(stored, "jane@example.com", code === "000000" ? "000001" : "000000")).toBe(false);
    expect(codesMatch(stored, "jane@example.com", "12345")).toBe(false);
    expect(codesMatch(null, "jane@example.com", code)).toBe(false);
  });
  it("masks emails for display", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("j•••e@example.com");
    expect(maskEmail("jo@example.com")).toBe("j•••@example.com");
  });
});
