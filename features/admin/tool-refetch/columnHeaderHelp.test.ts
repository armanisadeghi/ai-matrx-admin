/** @jest-environment node */
// A column header is itself a button (drag to reorder, click to sort). A header that carries its own
// InfoHint puts a button inside a button, which React reports as a hydration error (#418) on every
// load of /administration/reporting/tool-refetch. Help for a column goes in `helpText`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(full);
  }
  return out;
}

describe("column headers never hold a button of their own", () => {
  it("no table column header embeds an InfoHint (use helpText)", () => {
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), "features"))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/\bheader:\s*<[^>]*>[^]*<InfoHint\b/.test(line)) offenders.push(`${file}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
