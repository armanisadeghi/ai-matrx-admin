// INSTALL-ORDER (2026-10-20): "Team Wiki & Company Home" failed its first press with 'The template binds "related_tables" to its
// "team" table, which was not created.' The pack's assistant variable named a table token the pack never makes (the table is "dept");
// the records validator's "describe" profile did not report it, so the pack was published as it was and EVERY copy hit the error.
// Proven both ways: every committed pack names only tables it makes, and a planted token that is not a table is reported at its path.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "../template-pack-check";
import type { SpaceTemplatePack } from "../template-pack";

const DIR = join(__dirname, "../../../features/spaces/templates/packs");
const files = readdirSync(DIR).filter((f) => f.endsWith(".pack.json"));
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as SpaceTemplatePack;
const variableFindings = (p: SpaceTemplatePack) => checkPack(p).filter((f) => f.at.startsWith("spec.agent.variables"));

describe("a pack's assistant binds only tables the pack makes", () => {
  it("reads the committed packs", () => {
    expect(files.length).toBeGreaterThan(100);
  });
  it.each(files)("%s", (f) => {
    expect(variableFindings(read(f))).toEqual([]);
  });
  it("reports a variable that names a table the pack does not make, at its path", () => {
    const p = read("team-wiki-company-home.pack.json");
    const spec = p.spec as unknown as { agent: { variables: Array<{ table: string }> } };
    spec.agent.variables[1]!.table = "team";
    const found = variableFindings(p);
    expect(found.map((f) => f.at)).toEqual(["spec.agent.variables[1]"]);
    expect(found[0]!.says).toContain('"team"');
  });
});
