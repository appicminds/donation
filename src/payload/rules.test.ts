import { describe, expect, it } from "vitest";
import { hasRole, isSuperAdmin } from "./roles";
import { checkMediaApproval, checkMemoryApproval, checkPublish, resolvePaymentsSwitch } from "./rules";

const editor = { id: 1, roles: ["editor"] };
const publisher = { id: 2, roles: ["publisher"] };
const admin = { id: 3, roles: ["super_admin"] };

describe("roles", () => {
  it("super admin implies every role", () => {
    expect(hasRole(admin, "moderator")).toBe(true);
    expect(hasRole(editor, "moderator")).toBe(false);
    expect(hasRole(null, "editor")).toBe(false);
    expect(isSuperAdmin(publisher)).toBe(false);
  });
});

describe("moderation consent", () => {
  it("blocks approval without public-display consent", () => {
    expect(checkMemoryApproval({ status: "approved", publicConsent: false })).toMatch(/did not give permission/);
    expect(checkMemoryApproval({ status: "approved", publicConsent: true })).toBeNull();
    expect(checkMemoryApproval({ status: "rejected", publicConsent: false })).toBeNull();
  });
});

describe("media approval", () => {
  it("requires rights and alt text", () => {
    expect(checkMediaApproval({ approvalStatus: "approved", rightsConfirmed: false, alt: "x" })).toMatch(/rights/);
    expect(checkMediaApproval({ approvalStatus: "approved", rightsConfirmed: true, alt: " " })).toMatch(/alt text/);
    expect(checkMediaApproval({ approvalStatus: "approved", rightsConfirmed: true, alt: "Comfort" })).toBeNull();
    expect(checkMediaApproval({ approvalStatus: "pending" })).toBeNull();
  });

  it("requires a visitor's own consent for visitor photos", () => {
    const ok = { approvalStatus: "approved", rightsConfirmed: true, alt: "A garden" };
    expect(checkMediaApproval({ ...ok, origin: "visitor", visitorConsent: false })).toMatch(/visitor did not give/);
    expect(checkMediaApproval({ ...ok, origin: "visitor", visitorConsent: true })).toBeNull();
    expect(checkMediaApproval({ ...ok, origin: "family" })).toBeNull();
  });
});

describe("publishing", () => {
  it("lets editors save drafts but not publish", () => {
    expect(checkPublish(editor, "draft")).toBeNull();
    expect(checkPublish(editor, "published")).toMatch(/publisher/);
    expect(checkPublish(publisher, "published")).toBeNull();
    expect(checkPublish(admin, "published")).toBeNull();
  });
});

describe("two-person payments switch", () => {
  it("records a request from the first admin without enabling", () => {
    const r = resolvePaymentsSwitch({ paymentsEnabled: false }, { paymentsEnabled: true }, "a");
    expect(r.paymentsEnabled).toBe(false);
    expect(r.paymentsEnableRequestedBy).toBe("a");
    expect(r.message).toMatch(/second super administrator/);
  });

  it("does not let the same admin confirm their own request", () => {
    const r = resolvePaymentsSwitch(
      { paymentsEnabled: false, paymentsEnableRequestedBy: "a" },
      { paymentsEnabled: true },
      "a",
    );
    expect(r.paymentsEnabled).toBe(false);
  });

  it("enables when a different admin confirms", () => {
    const r = resolvePaymentsSwitch(
      { paymentsEnabled: false, paymentsEnableRequestedBy: { id: "a" } },
      { paymentsEnabled: true },
      "b",
    );
    expect(r).toEqual({ paymentsEnabled: true, paymentsEnableRequestedBy: null, message: null });
  });

  it("always allows switching off and clears pending requests", () => {
    expect(resolvePaymentsSwitch({ paymentsEnabled: true }, { paymentsEnabled: false }, "a").paymentsEnabled).toBe(
      false,
    );
    expect(
      resolvePaymentsSwitch({ paymentsEnabled: false, paymentsEnableRequestedBy: "a" }, { paymentsEnabled: false }, "b")
        .paymentsEnableRequestedBy,
    ).toBeNull();
  });
});
