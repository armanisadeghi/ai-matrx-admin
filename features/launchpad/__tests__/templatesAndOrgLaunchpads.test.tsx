// Audit #5 (custom-experience, 2026-10-22): no launchpad could be saved as a template, and nothing created an
// organization launchpad (`org:<key>`) — read path only. Now:
//  - "Save as template" copies the layout into the same launchpad table under `template:person:<me>:<key>` (the
//    person's own) or `template:org:<key>` (the organization's, owner/admin only); the gallery reads both.
//  - An owner or admin creates or edits the organization's launchpad; a member is refused (and copies it instead).
//  - Organization launchpads of every organization the person reads are listed (never filtered by the active one).
import { act } from "react";
import { createRoot } from "react-dom/client";

const ME = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG_A = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const ORG_B = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";

type Row = { _id: string; _organizationId: string; key: string; title: string; owner: string; doc: string; saved_at: string; note: string | null };
const world: { rows: Row[]; writes: { data: Record<string, unknown>; organizationId: string }[]; role: string | null } = { rows: [], writes: [], role: "member" };

jest.mock("@ai-matrx/records/react", () => ({
  useRecordsClient: () => ({ config: { organizationId: ORG_A } }),
  useTypedTable: () => ({ rows: world.rows, loading: false, error: null, reload: () => {} }),
  upsertAppRow: async (_c: unknown, _t: unknown, data: Record<string, unknown>, opts: { organizationId: string }) => {
    world.writes.push({ data, organizationId: opts.organizationId });
    return { ok: true, data: "new-id" };
  },
  removeAppRow: async () => ({ ok: true, data: null }),
  listAppRows: async () => ({ ok: true, data: { rows: world.rows } }),
}));
jest.mock("@ai-matrx/records/versions", () => ({ readVersionNow: async () => 1 }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => ME }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => ME }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));
jest.mock("@/features/organizations/service", () => ({ getUserRole: async () => world.role }));
jest.mock("../startMigration", () => ({ moveStartPageOnce: async () => "skipped" }));

import { useLaunchpads } from "../useLaunchpads";
import { EMPTY_LAUNCHPAD_DOC, serializeLaunchpadDoc } from "../doc";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const doc = serializeLaunchpadDoc(EMPTY_LAUNCHPAD_DOC);
const row = (id: string, key: string, owner: string, org: string, title = key): Row => ({
  _id: id, _organizationId: org, key, title, owner, doc, saved_at: "2026-10-20T10:00:00Z", note: null,
});

function mount() {
  let api: ReturnType<typeof useLaunchpads> | null = null;
  function Probe() {
    api = useLaunchpads();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return () => api!;
}

beforeEach(() => {
  world.rows = [
    row("r1", "start", `person:${ME}`, ORG_A, "Start"),
    row("r2", "team", "org", ORG_B, "Team board"),
    row("r3", "sales", `template:person:${ME}`, ORG_A, "Sales"),
    row("r4", "onboard", "template:org", ORG_B, "Onboarding"),
  ];
  world.writes = [];
  world.role = "member";
});

it("lists every organization's launchpad (not only the active one's) and never a template as a launchpad", () => {
  const pads = mount()();
  expect(pads.entries.map((e) => `${e.key}:${e.owner}`).sort()).toEqual(["start:person:" + ME, "team:org"].sort());
  expect(pads.templates.map((t) => t.title)).toEqual(["Sales", "Onboarding"]);
});

it("saves any launchpad as the person's own template, in the launchpad's organization", async () => {
  const pads = mount()();
  const start = pads.byKey("start")!;
  const answer = await act(() => pads.saveAsTemplate({ title: "Start", doc: EMPTY_LAUNCHPAD_DOC, owner: start.owner, organizationId: start.organizationId }, "mine"));
  expect(answer).toEqual({ ok: true, key: "start" });
  expect(world.writes).toHaveLength(1);
  expect(world.writes[0]!.data).toMatchObject({ slot: `template:person:${ME}:start`, owner: `template:person:${ME}`, key: "start" });
  expect(world.writes[0]!.organizationId).toBe(ORG_A);
});

it("an organization template and an organization launchpad need an owner or admin", async () => {
  const pads = mount()();
  const refusedTemplate = await act(() => pads.saveAsTemplate({ title: "Start", doc: EMPTY_LAUNCHPAD_DOC, owner: `person:${ME}`, organizationId: ORG_A }, "organization"));
  expect(refusedTemplate.ok).toBe(false);
  const refusedPad = await act(() => pads.save({ key: "everyone", title: "Everyone", doc: EMPTY_LAUNCHPAD_DOC, owner: "org" }, "New"));
  expect(refusedPad).toEqual({ ok: false, error: "Only an owner or admin can change the organization's launchpads." });
  // Editing the organization's existing launchpad is refused for a member too.
  const team = pads.byKey("team")!;
  expect((await act(() => pads.save({ key: "team", title: "Renamed", doc: EMPTY_LAUNCHPAD_DOC, owner: team.owner, organizationId: team.organizationId }, "x"))).ok).toBe(false);
  expect(world.writes).toEqual([]);

  world.role = "admin";
  const made = await act(() => pads.save({ key: "everyone", title: "Everyone", doc: EMPTY_LAUNCHPAD_DOC, owner: "org" }, "New"));
  expect(made).toEqual({ ok: true });
  expect(world.writes[0]).toMatchObject({ data: { slot: "org:everyone", owner: "org" }, organizationId: ORG_A });
  const orgTemplate = await act(() => pads.saveAsTemplate({ title: "Team board", doc: EMPTY_LAUNCHPAD_DOC, owner: team.owner, organizationId: team.organizationId }, "organization"));
  expect(orgTemplate.ok).toBe(true);
  // An organization launchpad's template lives in that organization (not the active one).
  expect(world.writes[1]).toMatchObject({ data: { slot: "template:org:team-board", owner: "template:org" }, organizationId: ORG_B });
});

it("a member's own launchpad needs no role", async () => {
  const pads = mount()();
  const answer = await act(() => pads.save({ key: "mine", title: "Mine", doc: EMPTY_LAUNCHPAD_DOC, owner: `person:${ME}` }, "New"));
  expect(answer).toEqual({ ok: true });
  expect(world.writes[0]!.data).toMatchObject({ slot: `person:${ME}:mine` });
});
