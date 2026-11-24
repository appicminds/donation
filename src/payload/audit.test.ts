import { describe, expect, it } from "vitest";
import { changedFields } from "./audit";

describe("audit changedFields", () => {
  it("lists changed keys and never secrets", () => {
    expect(changedFields({ a: 1, password: "x" }, { a: 2, password: "y", b: 1 })).toEqual(["a", "b"]);
    expect(changedFields(undefined, { totpSecret: "s", status: "pending" })).toEqual(["status"]);
  });

  it("treats a populated relationship as equal to its id", () => {
    expect(changedFields({ reviewedBy: { id: 1, email: "a@b" } }, { reviewedBy: 1 })).toEqual([]);
    expect(changedFields({ reviewedBy: { id: 1 } }, { reviewedBy: 2 })).toEqual(["reviewedBy"]);
  });
});
