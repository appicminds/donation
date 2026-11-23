import { describe, expect, it } from "vitest";
import { createSession, hashToken, newLoginToken, normaliseEmail, readSession, SESSION_TTL_MS } from "./session";

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
