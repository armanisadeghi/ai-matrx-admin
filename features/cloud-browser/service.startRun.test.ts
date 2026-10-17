/**
 * The fleet admits exactly ONE browser. So a duplicate start is not a benign
 * retry — the loser 503s and the panel renders that failure even though a
 * browser was successfully created. Observed in production 2026-08-23.
 */

import { configureStore } from "@reduxjs/toolkit";

import { postJson } from "@/lib/python-client";
import appContextReducer, {
  setOrganization,
  setOrgBootstrapResolved,
} from "@/lib/redux/slices/appContextSlice";
import { setStoreSingleton } from "@/lib/redux/store-singleton";
import { forgetProfileAccess, listProfiles, loadSnapshot, loadSnapshotForRun } from "./service";

/**
 * A REAL store with the REAL appContext reducer, published through the REAL
 * singleton the service's organization admission reads. `startRun` refuses
 * without an admitted organization and stamps the POST with it, so a mocked
 * admission would hide exactly the thing the server gate cares about.
 */
const store = configureStore({ reducer: { appContext: appContextReducer } });
setStoreSingleton(store);

jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(),
  postJson: jest.fn(),
}));

const profileRow = {
  id: "prof-1",
  owner_type: "user",
  owner_user_id: "user-1",
  // A real UUID: `requireOrganizationContext` refuses anything else, exactly as
  // it does in the browser.
  organization_id: "3f4b1a2c-9d8e-4c7a-b6f5-1e2d3c4b5a60",
  org_access_mode: "all_members",
  display_name: "My Cloud Browser",
  is_default: true,
  status: "active",
  home_region: "us-east-1",
  checkpoint_status: "none",
  current_checkpoint_revision: 0,
  current_checkpoint_at: null,
  current_checkpoint_bytes: null,
  chromium_version: null,
  last_started_at: null,
  last_stopped_at: null,
  expires_at: null,
};

const runRow = {
  id: "run-1",
  profile_id: profileRow.id,
  state: "agent_control",
  mode: "handoff_capable",
  execution_target: "browser_fleet",
  controller_kind: "agent",
  controller_user_id: null,
  controller_revision: 1,
  current_origin: null,
  current_url: null,
  started_at: "2026-08-23T00:00:00.000Z",
  stopped_at: null,
  error_code: null,
  error_detail_safe: null,
};

type QueryResult = { data: unknown; error: null };
let mockMaybeSingleRun: typeof runRow | null = null;
let mockProfileRows: Array<typeof profileRow> = [profileRow];
// Declared with a rest parameter so the mock below can FORWARD its arguments into
// it. Without one, `mockGetResourceAccess(...args)` is a TS2556 spread into a
// zero-arity function — which broke `pnpm type-check` for the whole repo.
const mockGetResourceAccess = jest.fn(
  async (..._args: unknown[]) => ({ level: "admin" }),
);

function queryFor(table: string) {
  const result = (): QueryResult => {
    if (table === "profile") return { data: mockProfileRows, error: null };
    return { data: [], error: null };
  };
  const q: Record<string, unknown> & PromiseLike<QueryResult> = {
    then(resolve) {
      return Promise.resolve(result()).then(resolve);
    },
  };
  for (const method of [
    "select",
    "eq",
    "in",
    "is",
    "order",
    "limit",
    "gt",
    "returns",
  ]) {
    q[method] = () => q;
  }
  q.maybeSingle = async () => ({
    data: table === "run" ? mockMaybeSingleRun : null,
    error: null,
  });
  q.single = async () =>
    table === "run"
      ? { data: runRow, error: null }
      : { data: { metadata: {} }, error: null };
  return q;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: (table: string) => queryFor(table),
    }),
    auth: jest.requireActual("@/test-utils/supabase-auth").withClaims({
      getUser: jest.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
      getSession: jest.fn(async () => ({
        data: { session: { access_token: "t" } },
        error: null,
      })),
    }),
  },
}));

jest.mock("@/utils/permissions/access", () => ({
  getResourceAccess: (...args: unknown[]) => mockGetResourceAccess(...args),
}));

describe("run admission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingleRun = null;
    mockProfileRows = [profileRow];
    forgetProfileAccess();
    mockGetResourceAccess.mockResolvedValue({ level: "admin" });
    // The person has chosen an organization and boot has answered — the only
    // state in which the fleet accepts a start at all.
    store.dispatch(setOrganization({ id: profileRow.organization_id }));
    store.dispatch(setOrgBootstrapResolved(true));
  });

  it("drops super-admin-readable profiles with no canonical access", async () => {
    // Someone else's profile, readable only through the super-admin lane.
    mockProfileRows = [{ ...profileRow, id: "prof-other", owner_user_id: "user-2" }];
    mockGetResourceAccess.mockResolvedValue({ level: "none" });

    await expect(listProfiles()).resolves.toEqual([]);
  });

  // 2026-10-17: opening the Computer tab as an admin fired ~250
  // get_resource_access calls, one per visible profile, on every listing.
  it("asks the database about each profile at most once, never about one's own", async () => {
    mockProfileRows = [
      profileRow,
      { ...profileRow, id: "prof-a", owner_user_id: "user-2", is_default: false },
      { ...profileRow, id: "prof-b", owner_user_id: "user-3", is_default: false },
    ];
    const first = await listProfiles();
    await listProfiles();
    expect(first.map((p) => p.id)).toEqual(["prof-1", "prof-a", "prof-b"]);
    expect(first[0].accessLevel).toBe("admin");
    expect(mockGetResourceAccess).toHaveBeenCalledTimes(2);
    expect(mockGetResourceAccess.mock.calls.map((c) => c[1])).toEqual(["prof-a", "prof-b"]);
  });

  it("does not start a browser for a run that is not live", async () => {
    // The handoff seam must never conjure a browser off a stream event — that
    // is what would burn the fleet's single slot from the background.
    await expect(loadSnapshotForRun({ runId: "run-gone" })).resolves.toBeNull();
    expect(postJson).not.toHaveBeenCalled();
  });

  it("shares one start request across concurrent panel hydrations", async () => {
    let markStartReached!: () => void;
    const startReached = new Promise<void>((resolve) => {
      markStartReached = resolve;
    });
    let releaseStart!: () => void;
    const startGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    (postJson as jest.Mock).mockImplementation(async () => {
      markStartReached();
      await startGate;
      return { data: { run: { run_id: runRow.id } } };
    });

    const first = loadSnapshot(profileRow.id);
    const second = loadSnapshot(profileRow.id);
    await startReached;

    expect(postJson).toHaveBeenCalledTimes(1);
    releaseStart();
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);

    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postJson).toHaveBeenCalledWith(
      "/browser-manager/runs",
      expect.objectContaining({
        profile_id: profileRow.id,
        activation_key: expect.any(String),
      }),
      // The shared attempt carries the ADMITTED organization; the server's gate
      // refuses a start without it.
      { organizationId: profileRow.organization_id },
    );
  });

  it("does not replace an exact terminal run with a new browser", async () => {
    mockMaybeSingleRun = { ...runRow, state: "failed" };

    const snapshot = await loadSnapshot(profileRow.id, runRow.id);

    expect(snapshot.activeProfileId).toBe(profileRow.id);
    // The named run comes back in its terminal state rather than being hidden:
    // the queued-start poll is the only thing that can show the person their
    // start failed (a8bc8929f4, FEATURE.md 2026-09-17). What must never happen
    // is a replacement browser being started to fill the empty slot.
    expect(snapshot.run).toMatchObject({ id: runRow.id, state: "failed" });
    expect(postJson).not.toHaveBeenCalled();
  });
});
