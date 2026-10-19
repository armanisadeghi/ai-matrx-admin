/**
 * THE LAYOUT AT BOOT (custom-experience §5.3) — the server pick, the seed it reads, and the slice the
 * renderers draw from. The load-bearing promises:
 *   - nobody customized → `shell: null` in the seed → the default menu, the nav-data arrays THEMSELVES
 *     (zero extra work, an identical render);
 *   - a person's layout wins over her organization's, the organization's applies only for the organization
 *     the page runs in; the Standard view cookie and a guest always get the default;
 *   - a late seed with the "customized" cookie reserves the nav column instead of painting the default;
 *   - a malformed `shell` value is refused whole, loudly, never half-read.
 */
jest.mock("server-only", () => ({}), { virtual: true });
const cookieJar = new Map<string, string>();
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
  }),
}));

import { dockItems, primaryNavItems } from "../../constants/nav-data";
import { SHELL_CUSTOM_COOKIE, SHELL_LAYOUT_SCHEMA_VERSION, SHELL_VIEW_COOKIE, type ShellBootSeed, type ShellLayoutBody } from "../contract";
import { SHELL_CATALOG_VERSION } from "../catalog";
import { serializeShellLayoutBody } from "../validate";
import { resolveHeldShellLayout } from "../held";
import { parseShellBootSeed } from "../seed";
import reducer, {
  initialShellLayoutState,
  shellLayoutCleared,
  shellLayoutLoaded,
  shellLayoutStored,
  type ShellLayoutState,
} from "../shellLayoutSlice";
import { markShellLayoutDeviceAtSignIn, pickShellLayoutServer } from "../server";
import { parseCoreBootSeed, type CoreBootSeed } from "@/lib/boot/coreBootSeedShape";
import { REHYDRATE_ACTION_TYPE } from "@/lib/sync/engine/rehydrate";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
const USER = "00000000-0000-4000-8000-0000000000aa";

const body = (label: string): string =>
  serializeShellLayoutBody({
    schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION,
    basedOnCatalogVersion: SHELL_CATALOG_VERSION,
    sidebar: [{ kind: "link", id: `l.${label}`, label, icon: "Link2", href: `/${label}` }],
  } satisfies ShellLayoutBody);

const stored = (label: string, organizationId: string, version = 1) => ({
  recordId: `rec-${label}`,
  organizationId,
  version,
  updatedAt: `2026-10-19T00:00:0${version}Z`,
  body: body(label),
});

function bootSeed(shell: ShellBootSeed | null): CoreBootSeed {
  return {
    userId: USER,
    memberships: [{ container_id: ORG_A, role: "member", status: "active", created_at: "2026-01-01" }] as CoreBootSeed["memberships"],
    organizations: [{ id: ORG_A, slug: "a", name: "A" }, { id: ORG_B, slug: "b", name: "B" }] as CoreBootSeed["organizations"],
    counts: [],
    organizationsTotal: 2,
    organizationsHasMore: false,
    organizationsNextCursor: null,
    preferencesRow: { preferences: {}, last_active_organization_id: ORG_A, startup_organization_id: null } as CoreBootSeed["preferencesRow"],
    shell,
  };
}

const viewer = { isAdmin: false, isGuest: false };
const labels = (state: ShellLayoutState, v = viewer) => resolveHeldShellLayout(state, v).sidebar.map((i) => i.label);

beforeEach(() => cookieJar.clear());

describe("the server pick", () => {
  it("nobody customized: shell null → the default menu, the nav-data arrays themselves", async () => {
    const state = await pickShellLayoutServer(bootSeed(null), null);
    expect(state).toMatchObject({ enabled: true, status: "ready", person: null, organizations: {}, reserved: false });
    // No prediction is even run when there is nothing to pick from.
    expect(state.organizationId).toBeNull();
    const resolved = resolveHeldShellLayout(state, viewer);
    expect(resolved.source).toBe("default");
    expect(resolved.sidebar).toBe(primaryNavItems);
    expect(resolved.dock).toBe(dockItems);
  });

  it("a person's layout wins over her organization's", async () => {
    const state = await pickShellLayoutServer(
      bootSeed({ person: stored("mine", ORG_B), organizations: { [ORG_A]: stored("org", ORG_A) } }),
      null,
    );
    expect(resolveHeldShellLayout(state, viewer).source).toBe("person");
    expect(labels(state)).toEqual(["mine"]);
  });

  it("an organization's layout applies for the organization the page runs in, never another", async () => {
    const forA = await pickShellLayoutServer(bootSeed({ person: null, organizations: { [ORG_A]: stored("org-a", ORG_A) } }), null);
    expect(forA.organizationId).toBe(ORG_A);
    expect(resolveHeldShellLayout(forA, viewer).source).toBe("organization");
    expect(labels(forA)).toEqual(["org-a"]);
    const onlyB = await pickShellLayoutServer(bootSeed({ person: null, organizations: { [ORG_B]: stored("org-b", ORG_B) } }), null);
    expect(resolveHeldShellLayout(onlyB, viewer).sidebar).toBe(primaryNavItems);
  });

  it("the Standard view cookie forces the default", async () => {
    cookieJar.set(SHELL_VIEW_COOKIE, "standard");
    const state = await pickShellLayoutServer(bootSeed({ person: stored("mine", ORG_A), organizations: {} }), null);
    const resolved = resolveHeldShellLayout(state, viewer);
    expect(resolved.source).toBe("standard-view");
    expect(resolved.sidebar).toBe(primaryNavItems);
  });

  it("a guest always gets the default, whatever is held", () => {
    const state: ShellLayoutState = { ...initialShellLayoutState, enabled: true, status: "ready", person: stored("mine", ORG_A) };
    expect(resolveHeldShellLayout(state, { isAdmin: false, isGuest: true }).sidebar).toBe(primaryNavItems);
  });

  it("other route groups (slice not seeded) keep the default", () => {
    const state: ShellLayoutState = { ...initialShellLayoutState, person: stored("mine", ORG_A) };
    expect(resolveHeldShellLayout(state, viewer).sidebar).toBe(primaryNavItems);
  });

  it("a late seed reserves the nav column only when this browser holds a custom layout", async () => {
    expect((await pickShellLayoutServer(null, null)).reserved).toBe(false);
    cookieJar.set(SHELL_CUSTOM_COOKIE, "1");
    const late = await pickShellLayoutServer(null, null);
    expect(late).toMatchObject({ status: "unknown", reserved: true });
    cookieJar.set(SHELL_VIEW_COOKIE, "standard");
    expect((await pickShellLayoutServer(null, null)).reserved).toBe(false);
  });
});

describe("the seed", () => {
  it("reads the shell key, null when absent", () => {
    const raw = { user_id: USER, memberships: [], organizations: [], counts: [], organizations_total: 0, organizations_has_more: false };
    expect(parseCoreBootSeed({ ...raw, shell: null }, USER)?.shell).toBeNull();
    expect(parseCoreBootSeed(raw, USER)?.shell).toBeNull();
    const seed = parseCoreBootSeed({ ...raw, shell: { person: stored("mine", ORG_A), organizations: {} } }, USER);
    expect(seed?.shell?.person?.recordId).toBe("rec-mine");
  });

  it("refuses a malformed shell whole, with a warning naming it", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(parseShellBootSeed({ person: { recordId: 1 }, organizations: {} })).toBeNull();
    expect(parseShellBootSeed("nope")).toBeNull();
    expect(parseShellBootSeed({ person: null, organizations: { [ORG_A]: { body: 2 } } })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(3);
    expect(String(warn.mock.calls[0]?.[0])).toContain("iam.core_boot_seed().shell");
    warn.mockRestore();
  });

  it("an empty answer is the no-layout answer", () => {
    expect(parseShellBootSeed({ person: null, organizations: {} })).toBeNull();
  });
});

describe("the held layouts, after boot", () => {
  const ready: ShellLayoutState = { ...initialShellLayoutState, enabled: true, status: "ready", organizationId: ORG_A };

  it("a save re-renders at once; an older version never replaces a newer one", () => {
    let state = reducer(ready, shellLayoutStored({ target: "person", stored: stored("v2", ORG_A, 2) }));
    expect(labels(state)).toEqual(["v2"]);
    state = reducer(state, shellLayoutStored({ target: "person", stored: { ...stored("v2", ORG_A, 1), body: body("old") } }));
    expect(labels(state)).toEqual(["v2"]);
    state = reducer(state, shellLayoutCleared({ target: "person", organizationId: ORG_A }));
    expect(resolveHeldShellLayout(state, viewer).sidebar).toBe(primaryNavItems);
  });

  it("the device copy fills only a gap the server left; the store's answer always wins", () => {
    const cached = { type: REHYDRATE_ACTION_TYPE, payload: { sliceName: "shellLayout", state: { person: stored("cached", ORG_A), organizations: {} } }, meta: { fromRehydrate: true } };
    // The server answered (no layout): a stale device copy never resurrects one.
    expect(reducer(ready, cached).person).toBeNull();
    // The seed missed: the device copy paints.
    const late = { ...ready, status: "unknown" as const, reserved: true };
    const filled = reducer(late, cached);
    expect(filled).toMatchObject({ status: "ready", reserved: false });
    expect(labels(filled)).toEqual(["cached"]);
    // The store's answer replaces whatever is held.
    const fromServer = { ...cached, payload: { sliceName: "shellLayout", state: { fromServer: true, person: null, organizations: {} } } };
    expect(reducer(filled, fromServer).person).toBeNull();
    expect(reducer(late, shellLayoutLoaded(null))).toMatchObject({ status: "ready", reserved: false, person: null });
  });
  it("a store answer asked before a save never repaints the layout from before it (editor flash after Save)", () => {
    const first = reducer(ready, shellLayoutStored({ target: "person", stored: stored("mine", ORG_A, 1), at: 2_000 }));
    // A revalidation asked at t=1000 (before the save) answers "no layout" at t=2500: dropped.
    expect(labels(reducer(first, shellLayoutLoaded(null, 1_000)))).toEqual(["mine"]);
    const staleFetch = { type: REHYDRATE_ACTION_TYPE, payload: { sliceName: "shellLayout", state: { fromServer: true, requestedAt: 1_000, person: null, organizations: {} } }, meta: { fromRehydrate: true } };
    expect(labels(reducer(first, staleFetch))).toEqual(["mine"]);
    // One asked after the save is the truth (a clear on another device still lands).
    expect(reducer(first, shellLayoutLoaded(null, 3_000)).person).toBeNull();
    const freshFetch = { ...staleFetch, payload: { ...staleFetch.payload, state: { ...staleFetch.payload.state, requestedAt: 3_000 } } };
    expect(reducer(first, freshFetch).person).toBeNull();
  });
});

describe("sign-in tells the device it holds a layout (so a late seed reserves, never paints the default)", () => {
  const client = (data: unknown) => ({ schema: () => ({ rpc: async () => ({ data, error: null }) }) });
  beforeEach(() => cookieJar.clear());

  it("sets matrx_shell=1 when the person or an organization holds a layout; a later seed miss reserves", async () => {
    await markShellLayoutDeviceAtSignIn(client({ person: stored("mine", ORG_A), organizations: {} }));
    expect(cookieJar.get(SHELL_CUSTOM_COOKIE)).toBe("1");
    expect(await pickShellLayoutServer(null, null)).toMatchObject({ reserved: true, status: "unknown" });
  });

  it("leaves the cookie off for someone with no layout (no reserve, the default paints at once)", async () => {
    await markShellLayoutDeviceAtSignIn(client(null));
    expect(cookieJar.has(SHELL_CUSTOM_COOKIE)).toBe(false);
    expect(await pickShellLayoutServer(null, null)).toMatchObject({ reserved: false });
  });
});
