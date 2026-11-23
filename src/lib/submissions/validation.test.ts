import { describe, expect, it } from "vitest";
import { contactSchema, LIMITS, memorySchema, parse, photoSchema } from "./validation";

describe("memory validation", () => {
  it("accepts a minimal message and normalises optional fields", () => {
    const r = parse(memorySchema, { message: "  She was kind.  ", name: "", email: "" });
    expect(r).toEqual({
      ok: true,
      data: {
        message: "She was kind.",
        name: undefined,
        relationship: undefined,
        email: undefined,
        publicConsent: false,
        showName: false,
      },
    });
  });

  it("requires a message and limits its length", () => {
    expect(parse(memorySchema, { message: "   " })).toMatchObject({
      ok: false,
      errors: { message: "Please share your message." },
    });
    expect(parse(memorySchema, { message: "x".repeat(LIMITS.memory + 1) }).ok).toBe(false);
  });

  it("treats consent as opt-in only", () => {
    const unticked = parse(memorySchema, { message: "m", showName: "nope" });
    expect(unticked.ok && unticked.data.showName).toBe(false);
    const ticked = parse(memorySchema, { message: "m", publicConsent: "on" });
    expect(ticked.ok && ticked.data.publicConsent).toBe(true);
  });

  it("rejects malformed emails", () => {
    expect(parse(memorySchema, { message: "m", email: "not-an-email" })).toMatchObject({
      ok: false,
      errors: { email: expect.any(String) },
    });
  });
});

describe("photo validation", () => {
  it("requires the rights attestation", () => {
    expect(parse(photoSchema, {})).toMatchObject({
      ok: false,
      errors: { rightsAttested: expect.stringMatching(/permission/) },
    });
    expect(parse(photoSchema, { rightsAttested: "on" }).ok).toBe(true);
  });
});

describe("contact validation", () => {
  it("requires email, a known topic and a message", () => {
    const r = parse(contactSchema, { email: "", topic: "spam", message: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "topic"]);
    expect(parse(contactSchema, { email: "a@b.co", topic: "payment", message: "Help" }).ok).toBe(true);
  });
});
