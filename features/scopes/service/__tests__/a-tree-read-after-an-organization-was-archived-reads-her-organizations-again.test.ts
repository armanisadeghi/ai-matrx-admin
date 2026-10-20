/**
 * @jest-environment jsdom
 */
/**
 * THE SCOPE TREE NAMES HER LIVE ORGANIZATIONS — AS THEY ARE, NOT AS THEY WERE.
 *
 * Live 2026-10-20 (/agents/<id>/build, admin@admin.com): the page read her organizations at
 * 01:16:45.55; one of them was archived at 01:16:45.89; five seconds later the tree and its
 * skeleton named it and `custom.context_tree` / `context_tree_types` refused the WHOLE read (42501,
 * "This organization is archived"). The tree is the read of every live organization she is in, so a
 * refusal of one she was in a moment ago re-reads her organizations once and asks again for the
 * fresh live set. The same set refused again is a real refusal and is returned as it is.
 */
const USER = "a3c1d2e4-5f60-4718-9a2b-3c4d5e6f7081";
const LIVE = "7721ceda-72f0-4e4c-b712-00cf9dc8f117";
const ARCHIVED = "3af79daa-858c-4e4f-aee7-dff26deec69f";

const state = { archivedNow: false, memberReads: 0, doorCalls: [] as string[][] };

function orgRow(id: string, archived: boolean) {
  return { id, name: id.slice(0, 4), abbreviation: null, logo_url: null, slug: id, settings: {}, created_by: USER, archived_at: archived ? "2026-10-20T01:16:45Z" : null };
}

jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => USER, requireUserId: () => USER }));
jest.mock("@/utils/supabase/adminLane", () => ({ browserAdminLaneOpen: () => false, installAdminLane: () => undefined }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {}, createClient: () => ({}) }));
jest.mock("@/features/organizations/service", () => ({ getOrganization: async () => null }));
jest.mock("@/features/tasks/services/taskService", () => ({ adoptTaskOrganization: () => undefined, listProjectTaskIds: async () => [], listTaskSummaries: async () => [] }));
jest.mock("@/features/data-tables/data-source/table-home", () => ({ placeTableInRecordStore: () => undefined }));
jest.mock("@/features/organizations/service/membershipsService", () => ({ membershipsService: {} }));
jest.mock("@/features/organizations/service/memberOrganizationRows", () => ({
  forgetMemberOrganizationRows: () => undefined,
  readMemberOrganizationRows: async () => {
    state.memberReads += 1;
    // The archived organization leaves the live slice once it is archived.
    const rows = state.archivedNow ? [orgRow(LIVE, false)] : [orgRow(LIVE, false), orgRow(ARCHIVED, false)];
    return { ok: true, roleByOrgId: new Map(rows.map((r) => [r.id, "owner"])), rows };
  },
}));
jest.mock("@/features/organizations/service/myOrganizationsPage", () => ({
  readMyOrganizationsByIds: async () => ({ ok: true, entries: [] }),
}));
jest.mock("@/features/projects/service", () => ({
  listMyOrganizationsProjectSummaries: async () => [],
  listProjectSummariesInOrganizations: async () => [],
  adoptProjectOrganization: () => undefined,
}));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: {
    listForTargets: async () => ({ ok: true, data: { edges: [] } }),
    listForSources: async () => ({ ok: true, data: { edges: [] } }),
  },
}));
const refusal = {
  ok: false,
  error: {
    code: "door",
    sqlstate: "42501",
    message: "You are not a member of this organization, so you cannot work with its scopes. Ask an owner of it to add you.",
    detail: "This organization is archived, so there is nothing for you to do there until an owner restores it.",
  },
};
function door(ids: string[]) {
  state.doorCalls.push([...ids].sort());
  // The door decides on the database's truth: the organization is archived from the first call on.
  return ids.includes(ARCHIVED) ? refusal : null;
}
jest.mock("@/features/scopes/service/scopeDoors", () => ({
  readScopeFileText: async () => "",
  scopeDoors: () => ({
    tree: async (ids: string[]) => door(ids) ?? { ok: true, data: [] },
    types: async (ids: string[]) => door(ids) ?? { ok: true, data: { types: [], counts: {} } },
  }),
}));

import { forgetSharedScopeBootRead, scopesService } from "@/features/scopes/service/scopesService";

beforeEach(() => {
  forgetSharedScopeBootRead();
  state.archivedNow = false;
  state.memberReads = 0;
  state.doorCalls = [];
});

it.each([["whole"], ["skeleton"]] as const)(
  "the %s tree read across an organization archived after her organizations were read answers the live ones",
  async (shape) => {
    const read = scopesService.getScopeTree({ shape });
    // Archived between the membership read and the door's answer.
    state.archivedNow = true;
    const res = await read;
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.organizations.map((o) => o.id)).toEqual([LIVE]);
    expect(state.doorCalls).toEqual([[LIVE, ARCHIVED].sort(), [LIVE]]);
    expect(state.memberReads).toBe(2);
  },
);

it("a refusal that stands (the same live set) is returned once, never asked twice", async () => {
  // Her membership read still names it (the snapshot is not the cause): a real refusal.
  const res = await scopesService.getScopeTree();
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.sqlstate).toBe("42501");
  expect(state.doorCalls).toHaveLength(1);
});
