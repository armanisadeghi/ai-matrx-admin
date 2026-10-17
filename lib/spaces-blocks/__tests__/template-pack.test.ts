// The pack checker is proven both ways on the real exemplar: the committed Projects & Tasks pack passes, and each
// planted defect (a missing table token, a view on the wrong table, a field the table lacks, a dangling page link,
// a raw table id, a block the stored schema refuses, a records-store rule) is reported at its exact path.
// resolvePackBlocks swaps every token and gives fresh ids.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "../template-pack-check";
import { resolvePackBlocks, type SpaceTemplatePack } from "../template-pack";

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
