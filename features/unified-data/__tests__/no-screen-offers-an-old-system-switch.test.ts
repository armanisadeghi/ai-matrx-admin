/**
 * ONE SOURCE OF TRUTH (CD-CORE-21): no screen offers, reads or presses an "old system → new system" switch.
 *
 * "This system is useless until we delete all previous systems and have just one source of truth."
 * (Arman, systems/data/custom-data/VISION.md, 2026-09-27)
 *
 * The final switch was pressed for every organization on 2026-10-05 and every seam was retired, yet the
 * organization settings page still drew a "Data" card that said the old and new systems "run side by side",
 * read `platform.cutover_seams` and could call `platform.cutover_seam_press`. Those doors are dropped
 * (migrations/campaign/close_core_c_a_the_switch_machinery_is_gone.sql). This guard keeps every screen off
 * them: any source file under app/, features/, components/ or lib/ that names a switch door, imports the
 * retired switch screen, or says the two systems run side by side is RED.
 *
 * The press HISTORY stays (an audit of what was pressed, `platform.cutover_press_history`, admin only).
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..", "..", "..");
const DIRS = ["app", "features", "components", "lib"];
const SELF = relative(ROOT, __filename);

const FORBIDDEN: Array<{ what: string; re: RegExp }> = [
  { what: "the per-organization switch board door", re: /["'`]cutover_seams["'`]/ },
  { what: "the switch press door", re: /["'`]cutover_seam_press(_everyone)?["'`]/ },
  { what: "the older-tables switch question", re: /older_tables_switched|data_tables_switched_for_me|data_tables_born_in_the_new_system_for_me/ },
  { what: "the final switch", re: /_final_switch_(is_on|last|undo_retired|platform_org)/ },
  { what: "the retired switch screen", re: /unified-data\/cutover\b|\bOrgDataSwitches\b/ },
  { what: "the side-by-side sentence", re: /old and new systems run side by side/i },
];

function walk(dir: string, out: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const n of names) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs)$/.test(n) && !/\.generated\./.test(n) && !/database\.types\.ts$/.test(n)) out.push(p);
  }
}

export function findSwitchMentions(root: string, dirs: string[]): string[] {
  const files: string[] = [];
  for (const d of dirs) walk(join(root, d), files);
  const hits: string[] = [];
  for (const f of files) {
    const rel = relative(root, f);
    if (rel === SELF) continue;
    const text = readFileSync(f, "utf8");
    for (const { what, re } of FORBIDDEN) if (re.test(text)) hits.push(`${rel}: ${what}`);
  }
  return hits.sort();
}

describe("no screen offers an old-system switch (CD-CORE-21)", () => {
  it("names no switch door, switch screen or side-by-side sentence anywhere in the app", () => {
    expect(findSwitchMentions(ROOT, DIRS)).toEqual([]);
  });
});
