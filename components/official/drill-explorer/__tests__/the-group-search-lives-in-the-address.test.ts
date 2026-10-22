// The group search box lives in the address (`table.<id>.gq`) when the host gives the explorer a stable
// `urlStateId`, and the CX requests drill gives one — a link or a reload reopens it filtered.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("the group search lives in the address", () => {
  it("DrillExplorer hands its urlStateId to the answer table", () => {
    const src = read("components/official/drill-explorer/DrillExplorer.tsx");
    expect(src).toMatch(/<MatrxDrillAnswerTable[\s\S]*?\{\.\.\.\(urlStateId \? \{ urlStateId \} : \{\}\)\}/);
  });
  it("the prop is declared on DrillExplorerProps", () => {
    expect(read("components/official/drill-explorer/types.ts")).toMatch(/urlStateId\?: string \| undefined/);
  });
  it("the CX requests drill names its address id", () => {
    expect(read("features/cx-dashboard/explorer/CxRequestsDrill.tsx")).toMatch(/urlStateId="cx-requests"/);
  });
});
