/**
 * @jest-environment jsdom
 */
/**
 * FIRST-PAINT FETCH CONTRACT — G1, G2, G3 (Arman, 2026-10-16): the (core) layout reads the core set,
 * and the browser's boot reads of the same facts make NO request. Its refresh paths still ask: an
 * organization switch / a membership change / a preference write (forget), and a knob invalidation.
 *
 * The wire counts every door. The control (`no seed`) proves the counter sees the boot's reads.
 */
const USER = "a3c1d2e4-5f60-4718-9a2b-3c4d5e6f7081";
const ORG_A = "7721ceda-72f0-4e4c-b712-00cf9dc8f117";
const ORG_B = "1b2f6a0e-4c3d-4e5f-9a8b-7c6d5e4f3a21";
const DEVICE = "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e";

const calls: Record<string, number> = {};
const bump = (door: string) => (calls[door] = (calls[door] ?? 0) + 1);
const total = () => Object.values(calls).reduce((a, b) => a + b, 0);

jest.mock("server-only", () => ({}));
jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => USER, requireUserId: () => USER }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: jest.fn() }));
jest.mock("@/lib/scoped-config/deviceId", () => ({ getWebDeviceId: () => DEVICE }));

const MEMBERSHIPS = [
  { id: "m1", organization_id: ORG_A, container_id: ORG_A, user_id: USER, role: "owner", status: "active", created_at: "2026-01-01T00:00:00+00:00" },
  { id: "m2", organization_id: ORG_B, container_id: ORG_B, user_id: USER, role: "member", status: "active", created_at: "2025-01-01T00:00:00+00:00" },
];
const ORGS = [
  { id: ORG_A, name: "Harbor Kiln Ceramics", slug: "harbor-kiln", archived_at: null, created_at: "2026-01-01T00:00:00+00:00", updated_at: null },
  { id: ORG_B, name: "Quill & Fern Bindery", slug: "quill-fern", archived_at: null, created_at: "2025-01-01T00:00:00+00:00", updated_at: null },
];
const COUNTS = [
  { container_id: ORG_A, member_count: 3 },
  { container_id: ORG_B, member_count: 9 },
];
const PREFS_ROW = { preferences: { display: { mode: "dense" } }, last_active_organization_id: ORG_A, startup_organization_id: null };

function chain(door: string, answer: () => { data: unknown; error: null }) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "in", "eq", "is", "order", "range", "abortSignal", "limit"]) q[m] = () => q;
  q.maybeSingle = () => (bump(door), Promise.resolve({ data: PREFS_ROW, error: null }));
  q.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
    bump(door);
    return Promise.resolve(answer()).then(res, rej);
  };
  return q;
}

function rpc(fn: string) {
  if (fn === "knob_defaults") return chain(fn, () => ({ data: { version: "d1", unchanged: false, defaults: { "billing.free_period_warning_days": 5 } }, error: null }));
  if (fn === "knob_snapshot_delta") return chain(fn, () => ({ data: { etag: "e1", defaults_version: "d1", overrides: { "chat.x": true } }, error: null }));
  if (fn === "mbr_for_user") return chain(fn, () => ({ data: MEMBERSHIPS, error: null }));
  if (fn === "mbr_count") return chain(fn, () => ({ data: COUNTS, error: null }));
  return chain(fn, () => ({ data: null, error: null }));
}

const wire = {
  schema: (name: string) => ({
    rpc,
    from: (table: string) => chain(`${name}.${table}`, () => ({ data: table === "organizations" ? ORGS : [PREFS_ROW], error: null })),
  }),
  rpc,
  from: (table: string) => chain(`public.${table}`, () => ({ data: [], error: null })),
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: { access_token: "t", user: { id: USER } } }, error: null }),
  },
};
jest.mock("@/utils/supabase/client", () => ({ supabase: wire, createClient: () => wire }));

import { primeCoreBootSeed } from "@/lib/boot/coreBootSeed";
import { parseCoreBootSeed } from "@/lib/boot/coreBootSeedShape";
import { predictedOrganizationId } from "@/lib/boot/coreBootSeed.server";
import { getUserOrganizations } from "@/features/organizations/service";
import { forgetMemberOrganizationRows } from "@/features/organizations/service/memberOrganizationRows";
import { readAccountOrganizationChoices } from "@/lib/organizations/accountOrganizationChoices";
import { readAccountPreferencesRow, forgetAccountPreferencesRow } from "@/lib/account/accountPreferencesRow";
import { resolveActiveOrgContext } from "@/lib/organizations/resolveActiveOrgContext";
import { ensureKnobSnapshot, invalidateEffectiveKnob, primeKnobSnapshot } from "@/lib/scoped-config/effectiveKnobs";

const RAW_SEED = {
  user_id: USER,
  memberships: MEMBERSHIPS,
  organizations: ORGS,
  counts: COUNTS,
  preferences_row: PREFS_ROW,
  preferences_row_read: true,
};
const seed = () => parseCoreBootSeed(RAW_SEED, USER)!;
const knobSeed = { organizationId: ORG_A, userId: USER, deviceId: DEVICE, payload: { etag: "e1", defaults_version: "d1", overrides: { "chat.x": true } } };

/** Every boot consumer of G1-G3, asked the way boot asks. */
async function bootReads() {
  const [orgs, choices, prefs, knobs, ladder] = await Promise.all([
    getUserOrganizations(),
    readAccountOrganizationChoices(USER),
    readAccountPreferencesRow(USER),
    ensureKnobSnapshot(ORG_A, USER),
    resolveActiveOrgContext(USER, {}),
  ]);
  return { orgs, choices, prefs, knobs, ladder };
}

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  forgetMemberOrganizationRows();
  forgetAccountPreferencesRow();
  invalidateEffectiveKnob();
  window.localStorage.clear();
  jest.useRealTimers();
});

function warmStoredDefaults() {
  // This browser's stored copy of the platform values (written by an earlier load).
  window.localStorage.setItem("knobs.defaults.v1", JSON.stringify({ version: "d1", values: { "billing.free_period_warning_days": 5 } }));
}

it("control (no seed): the boot's reads reach the wire", async () => {
  await bootReads();
  expect(calls.mbr_for_user).toBeGreaterThan(0);
  expect(calls["iam.organizations"]).toBeGreaterThan(0);
  expect(calls.mbr_count).toBeGreaterThan(0);
  expect(calls["users.user_preferences"]).toBeGreaterThan(0);
  expect(calls.knob_snapshot_delta).toBeGreaterThan(0);
});

it("seeded: G1 organizations, G3 preferences and G2 knobs answer with zero requests, and the same answers", async () => {
  warmStoredDefaults();
  const control = await bootReads();
  for (const k of Object.keys(calls)) delete calls[k];
  forgetMemberOrganizationRows();
  forgetAccountPreferencesRow();
  invalidateEffectiveKnob();

  primeCoreBootSeed(seed());
  primeKnobSnapshot(knobSeed);
  const seeded = await bootReads();

  expect(calls).toEqual({});
  expect(seeded.orgs.map((o) => [o.id, o.memberCount, o.role])).toEqual(control.orgs.map((o) => [o.id, o.memberCount, o.role]));
  expect(seeded.choices).toEqual(control.choices);
  expect(seeded.prefs).toEqual(control.prefs);
  expect(seeded.knobs.resolved).toEqual(control.knobs.resolved);
  expect(seeded.ladder?.organization_id).toBe(ORG_A); // last active
});

it("seeded: the ladder still honours this tab's held organization and the link, with zero requests", async () => {
  primeCoreBootSeed(seed());
  const held = await resolveActiveOrgContext(USER, { heldOrganizationId: ORG_B });
  expect(held?.organization_id).toBe(ORG_B);
  const linked = await resolveActiveOrgContext(USER, { linkOrganizationId: `org=${ORG_B}`, switchWhenALinkAsks: true });
  expect(linked?.organization_id).toBe(ORG_B);
  expect(total()).toBe(0);
});

it("an organization switch / membership change still re-reads (forget drops the seed)", async () => {
  primeCoreBootSeed(seed());
  await bootReadsWithoutKnobs();
  expect(total()).toBe(0);
  // The switch's write forgets the account row; a membership write forgets the rows.
  forgetAccountPreferencesRow();
  forgetMemberOrganizationRows();
  await readAccountPreferencesRow(USER);
  await getUserOrganizations();
  expect(calls["users.user_preferences"]).toBe(1);
  expect(calls["iam.organizations"]).toBe(1);
});

it("a tab that lands on ANOTHER organization reads its own knob snapshot", async () => {
  warmStoredDefaults();
  primeKnobSnapshot(knobSeed);
  await ensureKnobSnapshot(ORG_B, USER);
  expect(calls.knob_snapshot_delta).toBe(1);
});

it("a knob invalidation (server-bus settings_changed / a write) still re-reads the snapshot", async () => {
  warmStoredDefaults();
  primeKnobSnapshot(knobSeed);
  await ensureKnobSnapshot(ORG_A, USER);
  expect(calls.knob_snapshot_delta).toBeUndefined();
  invalidateEffectiveKnob("chat.x");
  await ensureKnobSnapshot(ORG_A, USER);
  expect(calls.knob_snapshot_delta).toBe(1);
});

it("a seed for another device id is never installed", async () => {
  warmStoredDefaults();
  primeKnobSnapshot({ ...knobSeed, deviceId: "9e8d7c6b-5a49-4837-a625-1f0e9d8c7b6a" });
  await ensureKnobSnapshot(ORG_A, USER);
  expect(calls.knob_snapshot_delta).toBe(1);
});

it("a seed nobody read within a minute is dropped unread (the page sat open)", async () => {
  const now = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(now);
  primeCoreBootSeed(seed());
  spy.mockReturnValue(now + 61_000);
  await readAccountPreferencesRow(USER);
  expect(calls["users.user_preferences"]).toBe(1);
  spy.mockRestore();
});

it("server: the knob seed's organization is the ladder's (link → last active → start-up → first)", () => {
  expect(predictedOrganizationId(seed(), "")).toBe(ORG_A); // last active
  expect(predictedOrganizationId(seed(), `?org=${ORG_B}`)).toBe(ORG_B); // a link to a membership
  expect(predictedOrganizationId(seed(), "?org=quill-fern")).toBe(ORG_B); // by address
  expect(predictedOrganizationId(seed(), "?org=5d4c3b2a-1908-4f7e-8d6c-5b4a39281706")).toBe(ORG_A); // not a member
  const noChoice = parseCoreBootSeed({ ...RAW_SEED, preferences_row: null }, USER)!;
  expect(predictedOrganizationId(noChoice, null)).toBe(ORG_B); // first = oldest membership
});

async function bootReadsWithoutKnobs() {
  await Promise.all([getUserOrganizations(), readAccountOrganizationChoices(USER), readAccountPreferencesRow(USER)]);
}

it("streamed: a seed that missed the first byte arrives as a window global and answers the boot reads", async () => {
  warmStoredDefaults();
  // What BootSeedScript's inline scripts write.
  (window as unknown as Record<string, unknown>).__matrxCoreBootSeed = seed();
  (window as unknown as Record<string, unknown>).__matrxKnobBootSeed = [knobSeed];
  await bootReads();
  expect(calls).toEqual({});
  expect((window as unknown as Record<string, unknown>).__matrxCoreBootSeed).toBeUndefined();
});
