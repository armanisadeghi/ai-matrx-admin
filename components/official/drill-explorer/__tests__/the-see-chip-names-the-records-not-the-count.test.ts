import { readFileSync } from "node:fs";
import { join } from "node:path";

// "See requests" opened a list of executions: the chip used the count's noun. The trail takes the
// records' own noun; this fails if the host stops passing it or the installed package lacks the prop.
describe("the See chip names the records, not the count", () => {
  it("DrillExplorer passes the records noun and a has-records flag to the trail", () => {
    const src = readFileSync(join(__dirname, "..", "DrillExplorer.tsx"), "utf8");
    const trail = src.match(/<MatrxDrillTrail[^>]*>/s)?.[0] ?? "";
    expect(trail).toContain("recordsNoun");
    expect(trail).toMatch(/records=\{Boolean\(/);
  });
  it("the installed design-system serves the props", () => {
    const dts = readFileSync(join(process.cwd(), "node_modules/@ai-matrx/design-system/dist/data-table/index.d.cts"), "utf8");
    expect(dts).toMatch(/recordsNoun\?:/);
  });
});
