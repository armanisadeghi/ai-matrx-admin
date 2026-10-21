/**
 * The rules that put Claude cloud delivery on the account rows the computer already lists
 * (Arman, 2026-10-21): matched by email, case-insensitively; one row per account; the sign-in
 * running for a row is that row's state; a different account signed in is said plainly.
 */
import {
  cloudDeliveryFor,
  cloudDeliveryWords,
  signedInAsSomeoneElse,
  unmatchedCloudRows,
  type CloudAccountRow,
} from "@/features/ai-work/lib/claudeCloudDelivery";

const row = (over: Partial<CloudAccountRow>): CloudAccountRow => ({ id: "1", label: "a@x.com", email: "a@x.com", status: "connected", slot: "primary", ...over });

describe("claude cloud delivery rules", () => {
  it("matches a computer's account to its cloud row by email, any case", () => {
    expect(cloudDeliveryFor("A@X.com", [row({})], null).kind).toBe("ready");
    expect(cloudDeliveryFor("b@x.com", [row({})], null).kind).toBe("needs_sign_in");
    expect(cloudDeliveryFor("a@x.com", [row({ status: "disconnected" })], null).kind).toBe("signed_out");
  });

  it("a connected row wins over an older signed-out one for the same email", () => {
    const st = cloudDeliveryFor("a@x.com", [row({ id: "old", status: "disconnected" }), row({ id: "new" })], null);
    expect(st).toMatchObject({ kind: "ready", row: { id: "new" } });
  });

  it("the running sign-in belongs to the row it was started from only", () => {
    const running = { forEmail: "b@x.com", step: "starting" as const };
    expect(cloudDeliveryFor("b@x.com", [], running).kind).toBe("in_progress");
    expect(cloudDeliveryFor("a@x.com", [row({})], running).kind).toBe("ready");
    expect(cloudDeliveryWords({ kind: "in_progress", step: "awaiting_code" }).word).toBe("Waiting for your code");
  });

  it("cloud accounts the computer has not seen get one row each", () => {
    const rows = [row({ id: "1" }), row({ id: "2", email: "far@x.com", label: "far@x.com", status: "disconnected" }), row({ id: "3", email: "far@x.com", label: "far@x.com" })];
    expect(unmatchedCloudRows(["A@x.com"], rows).map((r) => r.id)).toEqual(["3"]);
  });

  it("signing in as another account than the row's is named, never silent", () => {
    expect(signedInAsSomeoneElse("a@x.com", "A@x.com")).toBeNull();
    expect(signedInAsSomeoneElse("a@x.com", "b@x.com")).toContain("You signed in as b@x.com, not a@x.com");
    expect(signedInAsSomeoneElse(null, "b@x.com")).toBeNull();
  });
});
