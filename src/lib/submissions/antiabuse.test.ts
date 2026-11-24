import { describe, expect, it } from "vitest";
import { checkFormSignals, clientIp, hashIp, HONEYPOT_FIELD, issueFormToken, STARTED_FIELD } from "./antiabuse";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("form signals", () => {
  const t0 = 1_700_000_000_000;
  const token = issueFormToken(t0);

  it("accepts a normal submission", () => {
    expect(checkFormSignals(form({ [STARTED_FIELD]: token }), t0 + 10_000)).toEqual({ ok: true });
  });

  it("catches the honeypot", () => {
    expect(checkFormSignals(form({ [STARTED_FIELD]: token, [HONEYPOT_FIELD]: "http://spam" }), t0 + 10_000)).toEqual({
      ok: false,
      reason: "honeypot",
    });
  });

  it("rejects instant, expired, missing and forged tokens", () => {
    expect(checkFormSignals(form({ [STARTED_FIELD]: token }), t0 + 500)).toMatchObject({ reason: "too-fast" });
    expect(checkFormSignals(form({ [STARTED_FIELD]: token }), t0 + 7 * 3600_000)).toMatchObject({ reason: "expired" });
    expect(checkFormSignals(form({}), t0)).toMatchObject({ reason: "token" });
    expect(checkFormSignals(form({ [STARTED_FIELD]: `${t0 - 60_000}.forged` }), t0)).toMatchObject({ reason: "token" });
  });
});

describe("ip handling", () => {
  it("hashes IPs consistently without revealing them", () => {
    expect(hashIp("203.0.113.5")).toBe(hashIp("203.0.113.5"));
    expect(hashIp("203.0.113.5")).not.toBe(hashIp("203.0.113.6"));
    expect(hashIp("203.0.113.5")).not.toContain("203");
  });

  it("prefers x-real-ip, then the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.9");
    expect(clientIp(new Headers())).toBeNull();
  });
});
