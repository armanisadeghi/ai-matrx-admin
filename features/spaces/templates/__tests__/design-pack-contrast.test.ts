// A design pack's seeded text colours read on their ground at 4.5:1 or more, in light AND dark
// (template-pack-check: color_pair + readsOnField). The ten design system starters
// (build-design-starters.py) depend on it: a starter an agent hands a person is never unreadable.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "@/lib/spaces-blocks/template-pack-check";

const PACK = join(__dirname, "..", "packs", "design-starter-near-blank.pack.json");

type Row = { values: Record<string, unknown> };
type Pack = { spec: { tables: Array<{ token: string; rows: Row[] }> } };

function load(): Pack {
  return JSON.parse(readFileSync(PACK, "utf8")) as Pack;
}

const contrastFindings = (p: unknown) => checkPack(p).filter((f) => /reads at .*:1/.test(f.says));

function setColor(p: Pack, name: string, value: { light: string; dark: string }) {
  const row = p.spec.tables.find((t) => t.token === "color")!.rows.find((r) => r.values.name === name)!;
  row.values.value = JSON.stringify(value);
}

describe("design pack contrast", () => {
  it("a starter as written has no contrast finding", () => {
    expect(contrastFindings(load())).toEqual([]);
  });

  it("refuses a hint colour too faint on its ground in light", () => {
    const p = load();
    setColor(p, "muted-foreground", { light: "#b0b0b0", dark: "#a3a3a3" });
    const found = contrastFindings(p);
    expect(found).toHaveLength(1);
    expect(found[0]!.says).toMatch(/"muted-foreground" on "muted" reads at .*:1 in light/);
  });

  it("refuses a pair that only fails in dark", () => {
    const p = load();
    setColor(p, "primary-foreground", { light: "#ffffff", dark: "#5a7fd0" });
    expect(contrastFindings(p).map((f) => f.says).join("\n")).toMatch(/in dark/);
  });
});
