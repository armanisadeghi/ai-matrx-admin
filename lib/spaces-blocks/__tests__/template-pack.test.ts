// The pack checker is proven both ways on the real exemplar: the committed Projects & Tasks pack passes, and each
// planted defect (a missing table token, a view on the wrong table, a field the table lacks, a dangling page link,
// a raw table id, a block the stored schema refuses, a records-store rule) is reported at its exact path.
// resolvePackBlocks swaps every token and gives fresh ids.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "../template-pack-check";
import { relativeWindowDays, resolvePackBlocks, type SpaceTemplatePack } from "../template-pack";

const PACK = JSON.parse(readFileSync(join(__dirname, "../../../features/spaces/templates/packs/projects-and-tasks.pack.json"), "utf8")) as SpaceTemplatePack;
const fresh = () => JSON.parse(JSON.stringify(PACK)) as SpaceTemplatePack;
const ats = (p: SpaceTemplatePack) => checkPack(p).map((f) => f.at);
// pages[0].blocks[3] is the Projects database block; [5] the Tasks one.
type DbProps = { source: Record<string, unknown>; views: Array<Record<string, unknown>> };
const projectsDb = (p: SpaceTemplatePack) => p.pages[0].blocks[3].props as unknown as DbProps;

describe("checkPack", () => {
  it("passes the committed exemplar", () => {
    expect(checkPack(PACK)).toEqual([]);
  });
  it("names a table token that does not exist", () => {
    const p = fresh();
    projectsDb(p).source.table = "projectz";
    expect(ats(p)).toContain("pages[0] (projects-and-tasks).blocks[3].props.source.table");
  });
  it("names a view that sits on another table", () => {
    const p = fresh();
    projectsDb(p).source.view = "task_board";
    expect(ats(p)).toContain("pages[0] (projects-and-tasks).blocks[3].props.source.view");
  });
  it("names a field the table does not have", () => {
    const p = fresh();
    projectsDb(p).views[0].groupField = "stage";
    expect(ats(p)).toContain("pages[0] (projects-and-tasks).blocks[3].props.views[0].groupField");
  });
  it("names a page link to no page", () => {
    const p = fresh();
    p.pages[0].blocks[1].children![0].children![0].props!.spaceId = "page:nowhere";
    expect(checkPack(p).some((f) => f.says.includes('"nowhere"'))).toBe(true);
  });
  it("refuses a real table id", () => {
    const p = fresh();
    projectsDb(p).source = { kind: "table", tableId: "9f1c3a52-0000-4000-8000-000000000001" };
    expect(ats(p)).toContain("pages[0] (projects-and-tasks).blocks[3].props.source");
  });
  it("runs the stored-page schema", () => {
    const p = fresh();
    p.pages[2].blocks.push({ type: "heading", text: [{ text: "No level" }] });
    expect(checkPack(p).some((f) => f.at.startsWith("pages[2]") && /JSON schema|heading/.test(f.says))).toBe(true);
  });
  it("judges a row template body by the stored-page rules (a bad body fails at New, not at publish)", () => {
    const p = fresh();
    const tables = (p.spec as unknown as { tables: Array<{ rowTemplates?: Array<Record<string, unknown>> }> }).tables;
    const withBody = tables.find((t) => t.rowTemplates?.some((rt) => rt.body));
    expect(withBody).toBeTruthy();
    const rt = withBody!.rowTemplates!.find((r) => r.body)!;
    (rt.body as { blocks: unknown[] }).blocks.push({ type: "heading", text: [{ text: "No level" }] });
    expect(checkPack(p).some((f) => /rowTemplates\[\d+\].*\.body$/.test(f.at))).toBe(true);
  });
  it("runs the records validator on the spec", () => {
    const p = fresh();
    p.spec.job = "nonsense" as never;
    expect(ats(p)).toContain("spec.job");
  });
  it("refuses a duplicate page key and a second root", () => {
    const p = fresh();
    p.pages[1].key = p.pages[2].key;
    p.pages[3].parent = null;
    expect(ats(p)).toEqual(expect.arrayContaining(["pages[2].key", "pages[3].parent"]));
  });
});

describe("resolvePackBlocks", () => {
  it("swaps table, view and page tokens and gives fresh ids", () => {
    let n = 0;
    const out = resolvePackBlocks(PACK.pages[0].blocks, {
      tables: { project: { tableId: "T-P", viewIds: { project_board: "V-PB" } }, task: { tableId: "T-T", viewIds: {} } },
      pages: { dashboard: "P-D", "weekly-review": "P-W", "how-we-work": "P-H", team: "P-T" },
      newId: () => `id${++n}`,
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain('"kind":"template"');
    expect(json).not.toContain("page:");
    expect((out[3].props as unknown as DbProps).source).toEqual({ kind: "table", tableId: "T-P", viewId: "V-PB" });
    expect((out[5].props as unknown as DbProps).source).toEqual({ kind: "table", tableId: "T-T" });
    expect(json).toContain('"spaceId":"P-D"');
    expect(new Set(json.match(/"id":"id\d+"/g)).size).toBe(json.match(/"id":"id\d+"/g)!.length);
  });
});

// BLOCK-FILTERS: a pack block view declares relative days ("within"), "me" and "anyOf" by field KEY; the checker
// names every wrong one at its path, and the install folds them (with the view's filters) into a field-id `where`.
describe("block view filter words", () => {
  const tasksDb = (p: SpaceTemplatePack) => p.pages[0].blocks[5].props as unknown as DbProps;
  const withView = (view: Record<string, unknown>) => {
    const p = fresh();
    tasksDb(p).views.push({ id: "view-x", name: "X", layout: "grid", ...view });
    return p;
  };
  // The added view lands after the pack's own views, whatever their number (the pack grows with upgrades).
  const vat = `pages[0] (projects-and-tasks).blocks[5].props.views[${tasksDb(fresh()).views.length}]`;
  it("passes a good Due this week and Overdue view", () => {
    expect(checkPack(withView({ within: { due_on: { relative: "this_week" } } }))).toEqual([]);
    expect(checkPack(withView({ within: { due_on: { relative: "before_today" } }, anyOf: { status: ["To do", "In progress"] } }))).toEqual([]);
  });
  it("names a day range on a field that is not a date", () => {
    expect(ats(withView({ within: { status: { relative: "this_week" } } }))).toContain(`${vat}.within.status`);
  });
  it("names an unknown field key and a bad word", () => {
    const at = ats(withView({ within: { due: { relative: "this_week" }, due_on: { relative: "soonish" } } }));
    expect(at).toEqual(expect.arrayContaining([`${vat}.within.due`, `${vat}.within.due_on.relative`]));
  });
  it("names a missing or stray n", () => {
    expect(ats(withView({ within: { due_on: { relative: "next_days" } } }))).toContain(`${vat}.within.due_on.n`);
    expect(ats(withView({ within: { due_on: { relative: "today", n: 3 } } }))).toContain(`${vat}.within.due_on.n`);
  });
  it("names me on a column that is not a signed-in person", () => {
    expect(ats(withView({ me: ["assignee"] }))).toContain(`${vat}.me[0]`);
  });
  it("names an anyOf value that is not a choice, a hand-written where, and a chart view", () => {
    expect(ats(withView({ anyOf: { status: ["Someday"] } }))).toContain(`${vat}.anyOf.status`);
    expect(ats(withView({ where: { op: "and", args: [] } }))).toContain(`${vat}.where`);
    expect(ats(withView({ layout: "chart", chart: { type: "donut", groupBy: "status", op: "count" }, within: { due_on: { relative: "today" } } }))).toContain(`${vat}.layout`);
  });

  const block = (view: Record<string, unknown>) => [{ type: "database", props: { source: { kind: "template", table: "task" }, inline: true, views: [{ id: "v", name: "V", layout: "grid", ...view }] } }];
  const where = (out: ReturnType<typeof resolvePackBlocks>) => (out[0].props as unknown as DbProps).views[0];
  it("installs the words as a field-id where, the view's filters folded in", () => {
    const out = resolvePackBlocks(block({ filters: { priority: "High" }, within: { due_on: { relative: "next_days", n: 7 } }, anyOf: { status: ["To do"] }, me: ["owner"] }), {
      tables: { task: { tableId: "T", viewIds: {}, fieldIds: { due_on: "F-DUE", status: "F-ST", priority: "F-PR", owner: "F-OW" } } },
      pages: {},
      newId: () => "b",
    });
    const v = where(out);
    expect(v.filters).toBeUndefined();
    expect(v.within).toBeUndefined();
    expect(v.where).toEqual({
      op: "and",
      args: [
        { op: "eq", args: [{ field: "F-PR" }, { const: "High" }] },
        { op: "or", args: [{ op: "eq", args: [{ field: "F-ST" }, { const: "To do" }] }] },
        { op: "within", args: [{ field: "F-DUE" }, { const: { relative: "next_days", n: 7 } }] },
        { op: "eq", args: [{ field: "F-OW" }, { const: { me: true } }] },
      ],
    });
  });
  it("leaves a view with no words as it was", () => {
    const out = resolvePackBlocks(block({ filters: { status: "Done" } }), { tables: { task: { tableId: "T", viewIds: {} } }, pages: {}, newId: () => "b" });
    expect(where(out)).toEqual({ id: "v", name: "V", layout: "grid", filters: { status: "Done" } });
  });
  it("asks the preview's memory rows for the values inside the window", () => {
    const values = ["2026-10-12", "2026-10-14T09:30:00Z", "2026-10-19", "2026-10-11", null];
    const out = resolvePackBlocks(block({ within: { due_on: { relative: "this_week" } } }), {
      tables: { task: { tableId: "T", viewIds: {}, sample: "w", fieldIds: { due_on: "F" }, preview: { today: "2026-10-15", valuesOf: () => values } } },
      pages: {},
      newId: () => "b",
    });
    // Week of Wed 2026-10-15 = Mon 10-12 .. Sun 10-18.
    expect(where(out).where).toEqual({ op: "and", args: [{ op: "or", args: [{ op: "eq", args: [{ field: "F" }, { const: "2026-10-12" }] }, { op: "eq", args: [{ field: "F" }, { const: "2026-10-14T09:30:00Z" }] }] }] });
  });
});

describe("relativeWindowDays", () => {
  it("matches the store's half-open day ranges (weeks from Monday)", () => {
    const t = "2026-10-15";
    expect(relativeWindowDays({ relative: "today" }, t)).toEqual({ from: t, to: "2026-10-16" });
    expect(relativeWindowDays({ relative: "next_week" }, t)).toEqual({ from: "2026-10-19", to: "2026-10-26" });
    expect(relativeWindowDays({ relative: "last_month" }, t)).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(relativeWindowDays({ relative: "before_today" }, t)).toEqual({ to: t });
    expect(relativeWindowDays({ relative: "past_days", n: 3 }, t)).toEqual({ from: "2026-10-12", to: t });
  });
});
