/**
 * THE BULK TWIN RULE (2026-10-21) — one declaration, two surfaces.
 *
 * Spend approvals had five row verbs and three bulk buttons because the two lists were written
 * twice. `defineRowVerbs` / `bulkActionsFromRowVerbs` derive the bulk twin from the row verb, and
 * a selected row the verb does not apply to is skipped AND NAMED, never silently dropped.
 */
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
const archiveRecord = jest.fn(async () => undefined);
const restoreFromTrash = jest.fn(async () => undefined);
const carryOnTableRestore = jest.fn(async () => undefined);
jest.mock("@/features/trash/service", () => ({
  archiveRecord: (...a: unknown[]) => archiveRecord(...(a as [])),
  restoreFromTrash: (...a: unknown[]) => restoreFromTrash(...(a as [])),
  carryOnTableRestore: (...a: unknown[]) => carryOnTableRestore(...(a as [])),
}));
const copyText = jest.fn(async () => true);
jest.mock("@ai-matrx/kit/clipboard", () => ({ copyText: (...a: unknown[]) => copyText(...(a as [])) }));
const fileUnderTag = jest.fn(async () => "tag-1");
jest.mock("@/features/knowledge/hub/tags/tagApi", () => ({ fileUnderTag: (...a: unknown[]) => fileUnderTag(...(a as [])) }));
const pickTag = jest.fn();
jest.mock("@/features/knowledge/hub/tags/tagPickerOpener", () => ({ pickTag: (...a: unknown[]) => pickTag(...a) }));
jest.mock("@/features/scopes/homes/homePickerOpener", () => ({ pickHome: jest.fn() }));
jest.mock("@/features/scopes/homes/setHome", () => ({ setHome: jest.fn(), resolveHomeScopeId: jest.fn() }));
jest.mock("@/features/sharing/bulk/shareWithPeopleOpener", () => ({ shareWithPeople: jest.fn() }));

import { Check, History, Trash2, X } from "lucide-react";
import { bulkActionsFromRowVerbs, defineRowVerbs, NOT_LOADED_REASON } from "../rowVerbs";
import { BulkNoneDoneError } from "../bulkSkipped";
import { standardBulkActionsFor } from "../standardBulkActions";
import type { EntityBulkSelection } from "../selection";

interface Row {
  id: string;
  name: string;
  status: "waiting" | "approved";
  deleted_at?: string | null;
  organization_id?: string;
}
const rows: Row[] = [
  { id: "r1", name: "Nightly digest", status: "waiting" },
  { id: "r2", name: "Lead scorer", status: "approved" },
  { id: "r3", name: "Inbox triage", status: "waiting" },
];
const sel = (picked: Row[], extraIds: string[] = []): EntityBulkSelection<Row> => ({
  mode: "ids",
  ids: [...picked.map((r) => r.id), ...extraIds],
  rows: picked,
  count: picked.length + extraIds.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
});
const opts = { noun: "approval", getRowId: (r: Row) => r.id, getRowName: (r: Row) => r.name };

beforeEach(() => jest.clearAllMocks());

describe("defineRowVerbs", () => {
  const approve = jest.fn(async (_id: string, _row: Row | undefined, _input: { value?: string }) => undefined);
  const make = () =>
    defineRowVerbs<Row>(
      [
        { id: "approve", icon: Check, label: "Approve", appliesTo: (r) => r.status !== "approved", unavailableTooltip: "Already approved", onClick: jest.fn(), bulk: { done: "Approved", runOne: approve } },
        { id: "reject", icon: X, label: "Reject", tone: "destructive", onClick: jest.fn(), bulk: { done: "Rejected", runOne: jest.fn(async () => undefined) } },
        { id: "history", icon: History, label: "History", onClick: jest.fn(), bulk: false, noBulk: "single" },
      ],
      opts,
    );

  it("one declaration gives every row action and a bulk twin for every verb not marked noBulk", () => {
    const { rowActionDefs, bulkActions } = make();
    expect(rowActionDefs.map((d) => d.id)).toEqual(["approve", "reject", "history"]);
    expect(rowActionDefs.every((d) => !("bulk" in d) && !("noBulk" in d))).toBe(true);
    expect(bulkActions.map((a) => [a.id, a.label])).toEqual([["approve", "Approve"], ["reject", "Reject"]]);
    expect(bulkActions[1].variant).toBe("destructive");
  });

  it("a selected row the verb does not apply to is skipped and NAMED with the verb's own sentence", async () => {
    const [approveBulk] = make().bulkActions;
    const result = await approveBulk.run(sel(rows), {});
    expect(approve.mock.calls.map((c) => c[0]).sort()).toEqual(["r1", "r3"]);
    expect(result).toMatchObject({ message: "Approved: 2 approvals.", refresh: true });
    expect(warning).toHaveBeenCalledWith("1 approval skipped", { description: "Lead scorer: Already approved" });
  });

  it("nothing applies → the bar grays the button with the reason, and a run names every skip", async () => {
    const [approveBulk] = make().bulkActions;
    const onlyApproved = sel([rows[1]]);
    expect(approveBulk.disabledReason?.(1, onlyApproved)).toBe("Already approved");
    expect(approveBulk.disabledReason?.(2, sel(rows))).toBeNull();
    // A selection the bar cannot fully see (rows on another page) is never grayed.
    expect(approveBulk.disabledReason?.(2, sel([rows[1]], ["off-page"]))).toBeNull();
    await expect(approveBulk.run(onlyApproved, {})).rejects.toThrow("None done. 1 approval skipped — Lead scorer: Already approved");
    expect(approve).not.toHaveBeenCalled();
  });

  it("a destructive twin without its own confirm still stops and names the count", () => {
    const [, rejectBulk] = make().bulkActions;
    expect(rejectBulk.confirm?.(sel(rows))).toMatchObject({ title: "Reject 3 approvals?", variant: "destructive" });
  });

  it("the asked value reaches every row's door; the confirm sees only the rows that will run", async () => {
    const runOne = jest.fn(async () => undefined);
    const confirm = jest.fn((t: { ids: string[] }) => ({
      title: `Approve ${t.ids.length} until?`,
      description: "Then Rejected.",
      ask: { kind: "date" as const, label: "Expires on", defaultValue: "2030-01-08" },
    }));
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "temporary", icon: Check, label: "Approve temporarily", appliesTo: (r) => r.status === "waiting", onClick: jest.fn(), bulk: { label: "Temporary", confirm, runOne } }],
      opts,
    );
    expect(bulkActions[0].label).toBe("Temporary");
    expect(bulkActions[0].confirm?.(sel(rows))?.title).toBe("Approve 2 until?");
    await bulkActions[0].run(sel(rows), { value: "2030-02-01" });
    expect(runOne).toHaveBeenCalledWith("r1", rows[0], { value: "2030-02-01" });
    expect(runOne).toHaveBeenCalledWith("r3", rows[2], { value: "2030-02-01" });
    expect(runOne).toHaveBeenCalledTimes(2);
  });

  it("a batch twin gets only the applicable ids and names every id it reports failed", async () => {
    const run = jest.fn(async (t: { ids: string[] }) => ({ failed: [{ id: t.ids[1], reason: "Changed since you looked" }] }));
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "approve", icon: Check, label: "Approve", appliesTo: (r) => r.status !== "approved", unavailableTooltip: "Already approved", onClick: jest.fn(), bulk: { done: "Approved", run } }],
      opts,
    );
    const result = await bulkActions[0].run(sel(rows), {});
    expect(run.mock.calls[0][0]).toEqual({ ids: ["r1", "r3"], rows: [rows[0], rows[2]] });
    expect(result).toMatchObject({ message: "Approved: 1 approval." });
    expect(warning).toHaveBeenCalledWith("2 approvals skipped", {
      description: "Lead scorer: Already approved · Inbox triage: Changed since you looked",
    });
  });

  it("a batch twin that resolves nothing did not run (its own dialog was canceled)", async () => {
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "approve", icon: Check, label: "Approve", onClick: jest.fn(), bulk: { run: async () => undefined } }],
      opts,
    );
    await expect(bulkActions[0].run(sel(rows), {})).resolves.toBeUndefined();
  });
});

describe("bulkActionsFromRowVerbs (a verb registry)", () => {
  const registry = [
    { id: "suspend", label: "Suspend", icon: X, danger: true },
    { id: "message", label: "Message", icon: Check },
  ] as const;

  it("every registry id is decided; noBulk verbs get no button; the registry's refusal is named", async () => {
    const suspend = jest.fn(async () => undefined);
    const actions = bulkActionsFromRowVerbs<(typeof registry)[number], Row>(
      registry,
      { suspend: { done: "Suspended", runOne: suspend }, message: { noBulk: "single" } },
      { ...opts, blocked: (verb, row) => (verb.id === "suspend" && row.id === "r2" ? "You can't suspend yourself" : null) },
    );
    expect(actions.map((a) => a.id)).toEqual(["suspend"]);
    expect(actions[0].variant).toBe("destructive");
    const result = await actions[0].run(sel(rows), {});
    expect(suspend).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ message: "Suspended: 2 approvals." });
    expect(warning).toHaveBeenCalledWith("1 approval skipped", { description: "Lead scorer: You can't suspend yourself" });
  });
});

describe("built-in archive pair follows the view", () => {
  const args = { token: "agx_agent", noun: "agent", rowIdOf: (r: Row) => r.id, labelOf: (r: Row) => r.name, config: undefined, favoritesShown: false };
  const ids = (archivedView?: "active" | "archived" | "all") => standardBulkActionsFor<Row>({ ...args, archivedView }).map((a) => a.id);

  it("active view → Move to Trash only; archived view → Restore only; all → both; each can be turned off", () => {
    expect(ids()).toEqual(["add-tag", "move-home", "share", "move-to-trash"]);
    expect(ids("archived")).toEqual(["add-tag", "move-home", "share", "restore"]);
    expect(ids("all")).toEqual(["add-tag", "move-home", "share", "restore", "move-to-trash"]);
    expect(standardBulkActionsFor<Row>({ ...args, archivedView: "all", config: { restore: false } }).map((a) => a.id)).not.toContain("restore");
  });

  it("Restore brings back archived rows through the one restore door and names the ones not in Trash", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, archivedView: "all" }).find((a) => a.id === "restore")!;
    const live = { ...rows[1], deleted_at: null };
    const mixed = [{ ...rows[0], deleted_at: "2026-10-01T00:00:00Z" }, live];
    const result = await restore.run(sel(mixed), {});
    expect(restoreFromTrash).toHaveBeenCalledTimes(1);
    expect(restoreFromTrash).toHaveBeenCalledWith("agx_agent", "r1");
    expect(result).toMatchObject({ message: "Restored: 1 agent.", keepIds: ["r2"] });
    expect(warning).toHaveBeenCalledWith("1 agent skipped", { description: "Lead scorer: Not in Trash" });
    expect(restore.disabledReason?.(1, sel([live]))).toBe("None of these are in Trash");
  });

  it("Restore runs the Trash page's carry-on, so a custom Table comes back whole (not half)", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, token: "record", archivedView: "archived" }).find((a) => a.id === "restore")!;
    await restore.run(sel([{ ...rows[0], deleted_at: "2026-10-01T00:00:00Z", organization_id: "org-1" }]), {});
    expect(restoreFromTrash).toHaveBeenCalledWith("record", "r1");
    expect(carryOnTableRestore).toHaveBeenCalledWith("record", "org-1", "r1");
  });

  it("a Table with no organization in reach is skipped and named BEFORE anything runs", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, token: "record", archivedView: "archived" }).find((a) => a.id === "restore")!;
    await expect(restore.run(sel([rows[0]]), {})).rejects.toThrow("Nightly digest: Not loaded — restore it from Trash");
    expect(restoreFromTrash).not.toHaveBeenCalled();
  });

  it("an archived-only view trusts the view: a row whose projection has no (or a stale) deleted_at still restores", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, archivedView: "archived" }).find((a) => a.id === "restore")!;
    const stale = [{ ...rows[0], deleted_at: null }, rows[1]];
    expect(restore.disabledReason?.(2, sel(stale))).toBeNull();
    await restore.run(sel(stale), {});
    expect(restoreFromTrash).toHaveBeenCalledTimes(2);
  });

  it("an 'all' view never guesses from other lifecycle fields: no deleted_at column → the door answers", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, archivedView: "all" }).find((a) => a.id === "restore")!;
    expect(restore.disabledReason?.(1, sel([rows[1]]))).toBeNull();
    await restore.run(sel([rows[1]]), {});
    expect(restoreFromTrash).toHaveBeenCalledWith("agx_agent", "r2");
  });

  it("site content (a CMS token) is refused by name: it restores from Trash, not this door", async () => {
    const restore = standardBulkActionsFor<Row>({ ...args, token: "cms_page", archivedView: "archived" }).find((a) => a.id === "restore")!;
    expect(() => restore.run(sel(rows), {})).toThrow("Restore site content from Trash");
    expect(restoreFromTrash).not.toHaveBeenCalled();
  });

  it("Move to Trash skips and names a row already in Trash", async () => {
    const trash = standardBulkActionsFor<Row>({ ...args, archivedView: "all" }).find((a) => a.id === "move-to-trash")!;
    await trash.run(sel([{ ...rows[0], deleted_at: "2026-10-01T00:00:00Z" }, rows[1]]), {});
    expect(archiveRecord).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith("1 agent skipped", { description: "Nightly digest: Already in Trash" });
  });
});

describe("built-in Add tag is THE tag picker", () => {
  const tag = () =>
    standardBulkActionsFor<Row>({ token: "agx_agent", noun: "agent", rowIdOf: (r) => r.id, labelOf: (r) => r.name, config: undefined }).find((a) => a.id === "add-tag")!;

  it("opens the picker (yours, or a new name) and files every row under the picked tag", async () => {
    pickTag.mockResolvedValueOnce("grant 2026");
    const result = await tag().run(sel(rows.slice(0, 2)), {});
    expect(pickTag).toHaveBeenCalledWith({ title: "Tag 2 agents", count: 2 });
    expect(fileUnderTag).toHaveBeenCalledWith("agx_agent", "r1", "grant 2026");
    expect(fileUnderTag).toHaveBeenCalledWith("agx_agent", "r2", "grant 2026");
    expect(result).toMatchObject({ message: 'Tagged "grant 2026": 2 agents.' });
  });

  it("closing the picker runs nothing and keeps the selection", async () => {
    pickTag.mockResolvedValueOnce(null);
    await expect(tag().run(sel(rows), {})).resolves.toBeUndefined();
    expect(fileUnderTag).not.toHaveBeenCalled();
  });
});

describe("unloaded rows are never counted as done", () => {
  it("a batch twin that loops targets.rows: an id with no loaded row is skipped and NAMED, and stays selected", async () => {
    const touched: string[] = [];
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "archive", icon: Trash2, label: "Archive", onClick: jest.fn(), bulk: { done: "Archived", run: async (t) => { t.rows.forEach((r) => touched.push(r.id)); return {}; } } }],
      opts,
    );
    const result = await bulkActions[0].run(sel([rows[0]], ["off-page"]), {});
    expect(touched).toEqual(["r1"]);
    expect(result).toMatchObject({ message: "Archived: 1 approval.", keepIds: ["off-page"] });
    expect(warning).toHaveBeenCalledWith("1 approval skipped", { description: `off-page: ${NOT_LOADED_REASON}` });
  });

  it("a batch door that acts on ids says what it did (`done`), and only those are counted", async () => {
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "reset", icon: X, label: "Reset", onClick: jest.fn(), bulk: { done: "Reset", run: async (t) => ({ done: t.ids }) } }],
      opts,
    );
    const result = await bulkActions[0].run(sel([rows[0]], ["off-page"]), {});
    expect(result).toMatchObject({ message: "Reset: 2 approvals." });
    expect(result).not.toHaveProperty("keepIds");
    expect(warning).not.toHaveBeenCalled();
  });
});

describe("a partial result keeps the skipped rows selected and names every one", () => {
  const many: Row[] = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, name: `Row ${i}`, status: i < 7 ? "approved" : "waiting" }));
  const make = (runOne = jest.fn(async () => undefined)) =>
    defineRowVerbs<Row>(
      [{ id: "approve", icon: Check, label: "Approve", appliesTo: (r) => r.status !== "approved", unavailableTooltip: "Already approved", onClick: jest.fn(), bulk: { done: "Approved", runOne } }],
      opts,
    ).bulkActions[0];

  it("keepIds = the skipped ids; five named inline, then +N more with Copy list of ALL of them", async () => {
    const result = await make().run(sel(many), {});
    expect(result).toMatchObject({ message: "Approved: 2 approvals.", keepIds: ["m0", "m1", "m2", "m3", "m4", "m5", "m6"] });
    const [title, options] = warning.mock.calls[0] as [string, { description: string; action: { label: string; onClick: () => void } }];
    expect(title).toBe("7 approvals skipped");
    expect(options.description).toBe(
      "Row 0: Already approved · Row 1: Already approved · Row 2: Already approved · Row 3: Already approved · Row 4: Already approved · +2 more",
    );
    expect(options.action.label).toBe("Copy list");
    options.action.onClick();
    expect(copyText).toHaveBeenCalledWith(many.slice(0, 7).map((r) => `${r.name}: Already approved`).join("\n"), expect.any(Object));
  });

  it("nothing done → BulkNoneDoneError carrying every skipped row (the shell keeps the whole selection)", async () => {
    const failing = make(jest.fn(async () => { throw new Error("Refused"); }));
    const error = await failing.run(sel(many), {}).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(BulkNoneDoneError);
    expect((error as BulkNoneDoneError).skipped).toHaveLength(9);
    expect((error as BulkNoneDoneError).message).toContain("· +4 more");
  });
});

describe("the confirm and the skip sentence", () => {
  it("no confirm dialog when every selected row is skipped (no 'Reject 0 approvals?')", () => {
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "reject", icon: X, label: "Reject", tone: "destructive", appliesTo: () => false, onClick: jest.fn(), bulk: { runOne: jest.fn(async () => undefined) } }],
      opts,
    );
    expect(bulkActions[0].confirm?.(sel(rows))).toBeNull();
  });

  it("a verb disabled for a stated reason names that reason, not 'Busy'", async () => {
    const { bulkActions } = defineRowVerbs<Row>(
      [{ id: "approve", icon: Check, label: "Approve", disabled: (r) => r.id === "r2", unavailableTooltip: "Only the owner decides", onClick: jest.fn(), bulk: { runOne: jest.fn(async () => undefined) } }],
      opts,
    );
    await bulkActions[0].run(sel(rows), {});
    expect(warning).toHaveBeenCalledWith("1 approval skipped", { description: "Lead scorer: Only the owner decides" });
  });
});
