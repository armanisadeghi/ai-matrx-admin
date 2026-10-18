// Every design pack (the Design system board SP0363 and the ten starters from build-design-starters.py):
// seeded text colors read at 4.5:1 on their ground and Lines colors (border, input, ring) at 3:1, in light
// AND dark; every pack carries the one token vocabulary; the typed designProfile is validated.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { checkPack } from "@/lib/spaces-blocks/template-pack-check";

const DIR = join(__dirname, "..", "packs");
const FILES = readdirSync(DIR).filter((f) => f === "design-system-board.pack.json" || f.startsWith("design-starter-"));

type Row = { values: Record<string, unknown> };
type Pack = { designProfile?: Record<string, unknown>; spec: { tables: Array<{ token: string; rows: Row[] }> } };

const load = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Pack;
const contrastFindings = (p: unknown) => checkPack(p).filter((f) => /reads at .*:1/.test(f.says));
const names = (p: Pack, token: string) => p.spec.tables.find((t) => t.token === token)!.rows.map((r) => String(r.values.name));

function setColor(p: Pack, name: string, value: { light: string; dark: string }) {
  const row = p.spec.tables.find((t) => t.token === "color")!.rows.find((r) => r.values.name === name)!;
  row.values.value = JSON.stringify(value);
}

describe("design packs", () => {
  it("covers the base board and all ten starters", () => {
    expect(FILES).toHaveLength(11);
  });

  it.each(FILES)("%s: every declared pair passes, light and dark", (f) => {
    expect(contrastFindings(load(f))).toEqual([]);
  });

  it.each(FILES)("%s: carries the shared token vocabulary and a typed profile", (f) => {
    const p = load(f);
    const vocab = JSON.stringify(names(load(FILES[0]!), "color").sort());
    expect(JSON.stringify(names(p, "color").sort())).toBe(vocab);
    for (const [t, core] of [
      ["type_style", ["display", "title", "heading", "body", "label", "caption", "code"]],
      ["spacing", ["space-1", "space-2", "space-3", "space-4", "space-6", "space-8", "control-height"]],
      ["radius", ["radius-sm", "radius-md", "radius-lg", "radius-full"]],
      ["shadow", ["shadow-sm", "shadow-md", "shadow-lg"]],
      ["opacity", ["opacity-disabled", "opacity-hover", "opacity-overlay"]],
      ["motion", ["motion-fast", "motion-base", "motion-slow"]],
    ] as const)
      expect(names(p, t)).toEqual(expect.arrayContaining([...core]));
    expect(p.designProfile).toBeDefined();
  });

  it("refuses a hint color too faint on its ground in light", () => {
    const p = load("design-starter-near-blank.pack.json");
    setColor(p, "muted-foreground", { light: "#b0b0b0", dark: "#a3a3a3" });
    expect(contrastFindings(p).map((f) => f.says)).toEqual([expect.stringMatching(/"muted-foreground" on "muted" reads at .*:1 in light/)]);
  });

  it("refuses a pair that only fails in dark", () => {
    const p = load("design-starter-near-blank.pack.json");
    setColor(p, "primary-foreground", { light: "#ffffff", dark: "#5a7fd0" });
    expect(contrastFindings(p).map((f) => f.says).join("\n")).toMatch(/in dark/);
  });

  it("holds a field outline to 3:1, not 4.5:1", () => {
    const p = load("design-starter-near-blank.pack.json");
    setColor(p, "input", { light: "#8a8a8a", dark: "#858585" }); // ~3.4:1 on white: fine for a line
    expect(contrastFindings(p)).toEqual([]);
    setColor(p, "input", { light: "#b5b5b5", dark: "#858585" }); // ~2:1: refused
    expect(contrastFindings(p).map((f) => f.says).join("\n")).toMatch(/"input" on "card" .* a Lines colour reaches 3:1/);
  });

  it("refuses a design profile with an unknown mood or a bad color", () => {
    const p = load("design-starter-calm-neutral.pack.json");
    p.designProfile = { ...p.designProfile, mood: ["sparkly"], primary: { light: "blue", dark: "#000000" } };
    const at = checkPack(p).map((f) => f.at);
    expect(at).toEqual(expect.arrayContaining(["designProfile.mood", "designProfile.primary"]));
  });
});
