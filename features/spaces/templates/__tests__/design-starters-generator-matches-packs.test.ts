// build-design-starters.py must reproduce the committed design packs exactly. The packs are hand-edited after
// generation (covers, versions) and the generator now carries those over, so a generator change that drifts from
// the committed packs (or a pack edit the generator would undo) fails here. Run `python3 .../build-design-starters.py`
// only after this passes against the packs you mean to keep.
// The ten starters must be byte-identical. The base board (SP0363) is hand-landed and its committed text mixes
// British and US spelling, so it is compared with "color" spelled "color" on both sides: everything else exact.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEMPLATES = join(__dirname, "..");
const PACKS = join(TEMPLATES, "packs");
const STARTERS = readdirSync(PACKS).filter((f) => f.startsWith("design-starter-"));
const BASE = "design-system-board.pack.json";
const spelled = (s: string) => s.replace(/color/g, "color").replace(/Color/g, "Color");

describe("build-design-starters.py output matches the committed packs", () => {
  let out: string;
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), "design-starters-"));
    execFileSync("python3", [join(TEMPLATES, "build-design-starters.py"), "--with-base", "--out", out], { stdio: "pipe" });
  });
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it("covers all ten starters", () => {
    expect(STARTERS).toHaveLength(10);
  });

  it.each(STARTERS)("%s is byte-identical", (f) => {
    expect(readFileSync(join(out, f), "utf8")).toBe(readFileSync(join(PACKS, f), "utf8"));
  });

  it("the base board matches apart from color/color spelling", () => {
    expect(spelled(readFileSync(join(out, BASE), "utf8"))).toBe(spelled(readFileSync(join(PACKS, BASE), "utf8")));
  });
});
