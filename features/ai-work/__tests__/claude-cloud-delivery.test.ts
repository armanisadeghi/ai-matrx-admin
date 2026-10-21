/**
 * The rules that put Claude cloud delivery on the account rows the computer already lists
 * (Arman, 2026-10-21): matched by email, case-insensitively; one row per account; the sign-in
 * running for a row is that row's state; a different account signed in is said plainly.
 */
import {
  cloudActionLabel,
  cloudDeliveryFor,
  cloudSharing,
  cloudSharingWords,
  EMAIL_UNKNOWN_REASON,
  cloudDeliveryWords,
  macCourierEmails,
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

  it("an account a live Mac delivers through reads Ready (via this Mac); a stale Mac record counts for nothing", () => {
    const now = Date.parse("2026-10-21T12:00:00Z");
    const mac = (ageS: number) => ({ app: "matrx-2", agent_mail_cloud: { at: new Date(now - ageS * 1000).toISOString(), fresh_s: 180, accounts: [{ key: "k".repeat(64), label: "A@x.com" }] } });
    const live = macCourierEmails([mac(30), null, { other: 1 }], now);
    expect([...live]).toEqual(["a@x.com"]);
    expect(macCourierEmails([mac(400)], now).size).toBe(0);
    const st = cloudDeliveryFor("a@x.com", [], null, live);
    expect(st.kind).toBe("ready_via_mac");
    expect(cloudDeliveryWords(st).word).toBe("Ready (via this Mac)");
    expect(cloudDeliveryFor("b@x.com", [], null, live).kind).toBe("needs_sign_in");
  });
});

/**
 * 2026-10-21 review: a row with no email said "Needs one sign-in" while its action was dimmed, and
 * two rows with one email both mapped to one cloud row with nothing saying so.
 */
describe("honest cloud states for unknown and shared emails", () => {
  it("an account with no email is 'Email not known', with the reason and what makes it known", () => {
    const st = cloudDeliveryFor(null, [row({})], null);
    expect(st.kind).toBe("email_unknown");
    expect(cloudDeliveryWords(st).word).toBe("Email not known");
    expect(cloudActionLabel(st, "x")).toContain(EMAIL_UNKNOWN_REASON);
    expect(EMAIL_UNKNOWN_REASON).toMatch(/fills in the next time this account signs in/);
  });

  it("rows with the same email are one shared sign-in; the first carries the action", () => {
    const share = cloudSharing([
      { id: "claude:1", email: "A@x.com", name: "a@x.com (main)" },
      { id: "claude:2", email: "a@x.com", name: "a@x.com (work)" },
      { id: "claude:3", email: "b@x.com", name: "b@x.com (b)" },
      { id: "claude:4", email: null, name: "Unknown" },
    ]);
    expect(share.get("claude:1")).toEqual({ primary: true, others: ["a@x.com (work)"], primaryName: "a@x.com (main)" });
    expect(share.get("claude:2")).toEqual({ primary: false, others: ["a@x.com (main)"], primaryName: "a@x.com (main)" });
    expect(share.has("claude:3")).toBe(false);
    expect(share.has("claude:4")).toBe(false);
    expect(cloudSharingWords(share.get("claude:2")!).sentence).toContain("use that row's cloud action");
  });
});
