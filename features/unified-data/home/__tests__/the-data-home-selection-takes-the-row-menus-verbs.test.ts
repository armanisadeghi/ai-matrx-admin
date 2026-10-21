/**
 * THE BULK TWIN RULE on the Data home: Archive, Restore and the favorite star work on a selection through
 * the same doors the row menu calls; a row a verb does not fit is skipped and NAMED, never silently dropped.
 */
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/features/trash/service", () => ({ archiveRecord: jest.fn(), restoreFromTrash: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagApi", () => ({ fileUnderTag: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagPickerOpener", () => ({ pickTag: jest.fn() }));
jest.mock("@/features/scopes/homes/homePickerOpener", () => ({ pickHome: jest.fn() }));
jest.mock("@/features/scopes/homes/setHome", () => ({ setHome: jest.fn(), resolveHomeScopeId: jest.fn() }));
jest.mock("@/features/sharing/bulk/shareWithPeopleOpener", () => ({ shareWithPeople: jest.fn() }));

import { dataHomeBulkActions, archiveSkip, restoreSkip } from "../dataHomeBulkActions";
import type { DataHomeRow } from "../dataHomeRows";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";

const row = (over: Partial<DataHomeRow>): DataHomeRow =>
  ({ id: "table:o:t1", itemId: "t1", name: "Leads", kind: "table", organizationId: "o", tableId: "t1", ...over }) as DataHomeRow;

const sel = (rows: DataHomeRow[]): EntityBulkSelection<DataHomeRow> => ({
  mode: "ids",
  ids: rows.map((r) => r.id),
  rows,
  count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
});

function make(over: Partial<Parameters<typeof dataHomeBulkActions>[0]> = {}) {
  const deps = {
    archiveTable: jest.fn(async () => null),
    archiveForm: jest.fn(async () => null),
    restoreTable: jest.fn(async () => null),
    restoreForm: jest.fn(async () => null),
    isStarred: jest.fn((r: DataHomeRow) => r.id === "table:o:starred"),
    setStarred: jest.fn(() => [] as string[]),
    onChanged: jest.fn(),
    ...over,
  };
  const actions = dataHomeBulkActions(deps);
  const by = (id: string) => actions.find((a) => a.id === id)!;
  return { deps, by, actions };
}

beforeEach(() => jest.clearAllMocks());

describe("the Data home's bulk verbs", () => {
  it("offers a twin for every mutating verb of the row menu", () => {
    const { actions } = make();
    expect(actions.map((a) => a.id)).toEqual(["archive", "restore", "favorite", "unfavorite"]);
  });

  it("archive runs the row's own door per table and form, and skips archived or other kinds, naming them", async () => {
    const { deps, by } = make();
    const table = row({});
    const form = row({ id: "form:o:f1", itemId: "f1", kind: "form", tableId: null, name: "Intake" });
    const done = row({ id: "table:o:t2", archived: true, name: "Old" });
    const dash = row({ id: "dashboard:o:d1", kind: "dashboard", tableId: null, name: "KPIs" });
    await by("archive").run(sel([table, form, done, dash]));
    expect(deps.archiveTable).toHaveBeenCalledTimes(1);
    expect(deps.archiveForm).toHaveBeenCalledTimes(1);
    const said = JSON.stringify(warning.mock.calls);
    expect(said).toContain("Old");
    expect(said).toContain("KPIs");
    expect(deps.onChanged).toHaveBeenCalled();
  });

  it("names the store's own sentence when one table refuses", async () => {
    const { by } = make({ archiveTable: jest.fn(async () => "Too big to archive in a batch.") });
    await by("archive").run(sel([row({})]));
    expect(JSON.stringify(warning.mock.calls)).toContain("Too big to archive in a batch.");
  });

  it("restore only fits archived rows the store will bring back", () => {
    expect(restoreSkip(row({ archived: false }))).toBe("Not archived");
    expect(restoreSkip(row({ archived: true, kind: "form", restoreBlockedReason: "Its table is archived" }))).toBe("Its table is archived");
    expect(restoreSkip(row({ archived: true }))).toBeNull();
    expect(archiveSkip(row({ archived: true }))).toBe("Already archived");
  });

  it("favorite flips only the rows that are not starred and names the cap refusals", async () => {
    const { deps, by } = make({ setStarred: jest.fn(() => ["table:o:t1"]) });
    await by("favorite").run(sel([row({}), row({ id: "table:o:starred", name: "Done" })]));
    expect(deps.setStarred).toHaveBeenCalledWith(["table:o:t1"], true);
    expect(JSON.stringify(warning.mock.calls)).toContain("up to");
  });
});
