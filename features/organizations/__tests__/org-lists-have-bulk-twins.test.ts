/**
 * THE BULK TWIN RULE for the organization lists: Members, Invitations, Teams, team people
 * and the admin roster each offer on a selection what they offer on one row. The doors are
 * the row's own doors; a row the server (or the list's own rule) refuses is skipped and named.
 */
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({
  toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: { rpc: jest.fn() } }));
const updateMemberRole = jest.fn(async (..._a: unknown[]) => ({ success: true }));
const removeMember = jest.fn(async (..._a: unknown[]) => ({ success: true }));
const cancelInvitation = jest.fn(async (..._a: unknown[]) => ({ success: true }));
const resendInvitation = jest.fn(async (..._a: unknown[]) => ({ success: true, emailSent: true }));
jest.mock("../service", () => ({
  updateMemberRole: (...a: unknown[]) => updateMemberRole(...a),
  removeMember: (...a: unknown[]) => removeMember(...a),
  cancelInvitation: (...a: unknown[]) => cancelInvitation(...a),
  resendInvitation: (...a: unknown[]) => resendInvitation(...a),
}));
const archiveTeam = jest.fn(async (..._a: unknown[]) => undefined);
const restoreTeam = jest.fn(async (..._a: unknown[]) => undefined);
const setTeamMemberRole = jest.fn(async (..._a: unknown[]) => undefined);
const removeTeamMember = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock("../service/teamsService", () => ({
  archiveTeam: (...a: unknown[]) => archiveTeam(...a),
  restoreTeam: (...a: unknown[]) => restoreTeam(...a),
  setTeamMemberRole: (...a: unknown[]) => setTeamMemberRole(...a),
  removeTeamMember: (...a: unknown[]) => removeTeamMember(...a),
}));
const setMemberStatus = jest.fn(async (..._a: unknown[]) => undefined);
const setMemberControls = jest.fn(async (..._a: unknown[]) => undefined);
const adminRemove = jest.fn(async (..._a: unknown[]) => ({ removed: true }));
const getOrgMember = jest.fn(async (..._a: unknown[]) => ({
  memberLevel: "team",
  tierOverride: "t2",
  storageCapBytes: 99,
  notes: "fresh note",
}));
jest.mock("../admin/service", () => ({
  getOrgMember: (...a: unknown[]) => getOrgMember(...a),
  setMemberStatus: (...a: unknown[]) => setMemberStatus(...a),
  setMemberControls: (...a: unknown[]) => setMemberControls(...a),
  removeMember: (...a: unknown[]) => adminRemove(...a),
}));
jest.mock("@/features/trash/service", () => ({ archiveRecord: jest.fn(), restoreFromTrash: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagApi", () => ({ fileUnderTag: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagPickerOpener", () => ({ pickTag: jest.fn() }));
jest.mock("@/features/scopes/homes/homePickerOpener", () => ({ pickHome: jest.fn() }));
jest.mock("@/features/scopes/homes/setHome", () => ({ setHome: jest.fn(), resolveHomeScopeId: jest.fn() }));
jest.mock("@/features/sharing/bulk/shareWithPeopleOpener", () => ({ shareWithPeople: jest.fn() }));

import type { EntityBulkSelection } from "@/lib/entity-list/selection";
import {
  orgInvitationBulkActions,
  orgMemberVerbs,
  teamBulkActions,
  teamMemberBulkActions,
} from "../bulk/orgRosterVerbs";
import { rosterVerbs } from "../admin/bulkVerbs";

// The tests build minimal rows; the verbs read only the fields each test sets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sel = (rows: any[], idOf: (r: any) => string): EntityBulkSelection<any> => ({
  mode: "ids",
  ids: rows.map(idOf),
  rows,
  count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
});
const byId = <T extends { id: string }>(actions: T[], id: string) => actions.find((a) => a.id === id)!;

beforeEach(() => jest.clearAllMocks());

describe("org Members list", () => {
  const mk = (id: string, role: "owner" | "admin" | "member") =>
    ({ id, userId: `u-${id}`, role, joinedAt: null, user: { id: `u-${id}`, email: `${id}@x.com` } }) as never;
  const rows = [mk("a", "member"), mk("b", "admin"), mk("o", "owner")];
  const onRoleChange = jest.fn();
  const onRemove = jest.fn();
  const { rowActionDefs, bulkActions: actions } = orgMemberVerbs({
    organizationId: "org-1",
    canManage: (m: { role: string }) => m.role !== "owner",
    ownerCount: 1,
    onRoleChange,
    onRemove,
  });

  it("row menu and bulk bar come from one declaration (same ids, real row handlers)", () => {
    expect(rowActionDefs.map((d) => d.id)).toEqual(["make-admin", "make-member", "remove"]);
    expect(actions.map((a) => a.id)).toEqual(["make-admin", "make-member", "remove"]);
    rowActionDefs[0].onClick(rows[0]);
    expect(onRoleChange).toHaveBeenCalledWith(rows[0], "admin");
    rowActionDefs[2].onClick(rows[0]);
    expect(onRemove).toHaveBeenCalledWith(rows[0]);
    // a member already admin has no Make Admin on their row menu
    expect(rowActionDefs[0].appliesTo!(rows[1])).toBe(false);
  });

  it("Remove names the count, not counting the skipped owner", () => {
    const rm = actions[2].confirm!(sel(rows, (r) => r.id)) as { title: string };
    expect(rm.title).toContain("2 members");
  });

  it("Make Admin runs the row door with the organization id, skipping the owner and those already admin", async () => {
    const result = await actions[0].run(sel(rows, (r) => r.id), {});
    expect(updateMemberRole).toHaveBeenCalledWith("org-1", "u-a", "admin");
    expect(updateMemberRole).not.toHaveBeenCalledWith("org-1", "u-o", expect.anything());
    expect(updateMemberRole).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).toContain("\"keepIds\":[\"b\",\"o\"]"); // skipped rows stay ticked, not counted done
  });

  it("removes through the row door with the organization id and never the last owner", async () => {
    await actions[2].run(sel(rows, (r) => r.id), {});
    expect(removeMember).toHaveBeenCalledWith("org-1", "u-a");
    expect(removeMember).toHaveBeenCalledWith("org-1", "u-b");
    expect(removeMember).not.toHaveBeenCalledWith("org-1", "u-o");
  });
});

describe("org Invitations list", () => {
  const rows = [
    { id: "i1", email: "a@x.com", role: "member", token: "t", invitedAt: "", expiresAt: "" },
    { id: "i2", email: "b@x.com", role: "member", token: "t", invitedAt: "", expiresAt: "" },
  ] as never[];
  const actions = orgInvitationBulkActions({ organizationId: "org-1" });

  it("Resend and Revoke run the row doors; Revoke names the count first", async () => {
    expect(actions.map((a) => a.id)).toEqual(["resend", "revoke"]);
    const s = sel(rows, (r) => r.id);
    await actions[0].run(s, {});
    expect(resendInvitation).toHaveBeenCalledTimes(2);
    expect((actions[1].confirm!(s) as { title: string }).title).toContain("2 invitations");
    await actions[1].run(s, {});
    expect(cancelInvitation).toHaveBeenCalledWith("i1");
    expect(cancelInvitation).toHaveBeenCalledWith("i2");
  });

  it("a resend whose email did not go out is named, not counted done", async () => {
    resendInvitation.mockResolvedValueOnce({ success: true, emailSent: false });
    const result = await actions[0].run(sel(rows, (r) => r.id), {});
    expect(JSON.stringify(result)).toMatch(/email could not be sent|1/);
  });
});

describe("Teams list", () => {
  const live = { id: "t1", name: "Front desk", archivedAt: null } as never;
  const gone = { id: "t2", name: "Old crew", archivedAt: "2026-01-01" } as never;
  const actions = teamBulkActions({});
  it("Archive skips archived teams and Restore skips live ones", async () => {
    const s = sel([live, gone], (r) => r.id);
    await byId(actions, "archive").run(s, {});
    expect(archiveTeam).toHaveBeenCalledTimes(1);
    expect(archiveTeam).toHaveBeenCalledWith("t1");
    await byId(actions, "restore").run(s, {});
    expect(restoreTeam).toHaveBeenCalledTimes(1);
    expect(restoreTeam).toHaveBeenCalledWith("t2");
  });
});

describe("people on one team", () => {
  const m = (u: string) => ({ id: u, userId: u, role: "member", joinedAt: null, user: { id: u, email: `${u}@x.com` } }) as never;
  const byUser = new Map<string, never>([
    ["u1", { userId: "u1", isListed: true, isFromHr: false } as never],
    ["u2", { userId: "u2", isListed: false, isFromHr: true } as never],
  ]);
  const actions = teamMemberBulkActions({ teamId: "t1", teamName: "Front desk", byUser });
  it("Set role asks a choice; Remove skips people who are on the team only through HR", async () => {
    const s = sel([m("u1"), m("u2")], (r) => r.id);
    await byId(actions, "set-role").run(s, { value: "admin" });
    expect(setTeamMemberRole).toHaveBeenCalledWith("t1", "u1", "admin");
    expect(setTeamMemberRole).toHaveBeenCalledWith("t1", "u2", "admin");
    await byId(actions, "remove").run(s, {});
    expect(removeTeamMember).toHaveBeenCalledTimes(1);
    expect(removeTeamMember).toHaveBeenCalledWith("t1", "u1");
  });
});

describe("admin member roster", () => {
  const row = (userId: string, over: Record<string, unknown> = {}) =>
    ({ userId, email: `${userId}@x.com`, displayName: null, role: "member", status: "active", memberLevel: "pro", tierOverride: null, storageCapBytes: 5, monthlyBudgetMcents: 7, notes: "n", ...over }) as never;
  const open = jest.fn();
  const { rowActionDefs, bulkActions: actions } = rosterVerbs({ orgId: "org-1", rate: 20000, capPoints: ["100000"], open });

  it("covers suspend, reactivate, spend cap and remove", () => {
    expect(actions.map((a) => a.id)).toEqual(["suspend", "reactivate", "spend-cap", "remove"]);
  });
  it("Suspend carries the one reason and skips the already suspended", async () => {
    const s = sel([row("a"), row("b", { status: "suspended" })], (r) => r.userId);
    await byId(actions, "suspend").run(s, { reason: "Left the company" });
    expect(setMemberStatus).toHaveBeenCalledTimes(1);
    expect(setMemberStatus).toHaveBeenCalledWith("org-1", "a", "suspended", "Left the company");
  });
  it("Set spend cap re-reads the member and carries the FRESH other controls, not the stale row", async () => {
    const s = sel([row("a")], (r) => r.userId);
    await byId(actions, "spend-cap").run(s, { value: "none" });
    expect(getOrgMember).toHaveBeenCalledWith("org-1", "a");
    expect(setMemberControls).toHaveBeenCalledWith("org-1", "a", {
      memberLevel: "team",
      tierOverride: "t2",
      storageCapBytes: 99,
      monthlyBudgetMcents: null,
      notes: "fresh note",
    });
  });
  it("the cap choices come from the knob's points, plus No limit", () => {
    const cap = actions.find((a) => a.id === "spend-cap");
    const q = cap?.confirm?.(sel([row("a")], (r) => r.userId)) as { ask: { options: { value: string }[] } };
    expect(q.ask.options.map((o) => o.value)).toEqual(["none", "100000"]);
  });
  it("Set spend cap is skipped and named while the knob has not loaded", async () => {
    const off = rosterVerbs({ orgId: "org-1", rate: 20000, capPoints: null, open }).bulkActions;
    setMemberControls.mockClear();
    await expect(
      byId(off, "spend-cap").run(sel([row("a")], (r) => r.userId), { value: "none" }),
    ).rejects.toBeDefined();
    expect(setMemberControls).not.toHaveBeenCalled();
  });
  it("the row menu is real: every verb opens the member through the same declaration", () => {
    expect(rowActionDefs.map((d) => d.id)).toEqual(["suspend", "reactivate", "spend-cap", "remove"]);
    rowActionDefs[0].onClick(row("a"));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ userId: "a" }));
  });
  it("Remove never touches the owner", async () => {
    const s = sel([row("a"), row("o", { role: "owner" })], (r) => r.userId);
    await byId(actions, "remove").run(s, {});
    expect(adminRemove).toHaveBeenCalledTimes(1);
    expect(adminRemove).toHaveBeenCalledWith("org-1", "a");
  });
});
