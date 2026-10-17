/**
 * `PropertyRow`'s `missing` prop FORCES the missing tag whenever it is truthy (a string only
 * names the tag). A row that passes a value AND a literal `missing="…"` therefore shows the tag
 * forever and hides the value (live 2026-10-17: the judge's stored reasoning read "None given").
 * Guard: no PropertyRow in the app passes both `value=` and a literal string `missing=`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("PropertyRow missing is conditional", () => {
  it("no row passes a value together with a literal missing string", () => {
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), "features"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/<PropertyRow\b[\s\S]*?\/?>/g)) {
        const tag = m[0];
        if (/\bvalue=/.test(tag) && /\bmissing="[^"]+"/.test(tag)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
