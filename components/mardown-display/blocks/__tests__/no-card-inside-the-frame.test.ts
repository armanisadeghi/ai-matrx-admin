/**
 * NO CARD INSIDE THE FRAME (Block Controls decision 1; Arman 2026-10-14: "a nice and clean wrapper";
 * adversarial review 4, 2026-10-20, F4).
 *
 * A block's one frame is the only box. Review 4 found progress tracker, troubleshooting, recipe and
 * decision tree each drawing a gradient "hero" card (and colored stat tiles) INSIDE the frame. The
 * header guard (`one-frame-header-slot.test.ts`) passed them, because it reads only the header row.
 *
 * This guard reads EVERY class string of EVERY block, found automatically: each folder under
 * `blocks/` holding a file that draws a frame (the host slot, `data-block-frame`, or a shared
 * wrapper), and every component file in that folder. Inside the frame none of these may appear:
 *  - a gradient panel: `bg-gradient-to-*` on anything but a bar or dot (`rounded-full`), clipped text,
 *    or an overlay over media (`absolute` / `fixed` / `inset-0`);
 *  - a raised card: rounded + `shadow-md`..`shadow-2xl` or `border-2`;
 *  - a filled tile: rounded-lg+ with padding p-3+ and its own fill (`bg-textured`, `bg-card`,
 *    `bg-background`, `bg-white`, or a light tint `bg-<hue>-50|100|200`). A dark code panel is content, not a card;
 *  - a saturated panel (review 4 live walk, decision tree's blue question banner): a solid palette fill
 *    `bg-<hue>-300..900` carrying white text or its own padding (p-2+ / px-2+) — a banner, an icon
 *    tile, a hand-colored button. The system's own fill is `bg-primary`; a dot or pill (`rounded-full`) passes;
 *  - a tinted panel (the decision tree's purple action rows): a light tint `bg-<hue>-100|200` with a
 *    border of a palette hue.
 * Light-mode words decide the saturated and tinted rules (a `dark:` twin follows its light word).
 * Fullscreen shells (`dvh` heights, the phone's full-screen card player), popovers/menus/modals/sheets/portals and loading skeletons are
 * not inside the frame and are not read. A quiet row (`border-border`, no fill, no shadow) passes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const FRAME = /useBlockHostSlot\(|data-block-frame|<ChatCollapsibleWrapper|<BlockHeaderWrapper|<ContentBlockWrapper/;
const NOT_IN_FRAME = /LoadingVisualization|Modal|Dialog|Menu|Popover|Sheet|Portal|MobileView/;
const HUE = "(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gray|slate|zinc)";
const FILL = new RegExp(`^bg-(textured|card|background|white|${HUE}-(50|100|200))(\\/\\d+)?$`);
const COLOR = "(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const SOLID = new RegExp(`^bg-${COLOR}-(300|400|500|600|700|800|900)(\\/\\d+)?$`);
const TINT = new RegExp(`^bg-${COLOR}-(100|200)(\\/\\d+)?$`);
const HUE_BORDER = new RegExp(`^border-${COLOR}-\\d`);

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(full);
    return /\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

/** Every class-looking string literal that breaks the rule, as `file:line  why  classes`. */
export function cardsInsideTheFrame(files: { rel: string; text: string }[]): string[] {
  const found: string[] = [];
  for (const { rel, text } of files) {
    // Single-quoted class strings too (`cn('…')`): research's gradient hero hid behind them.
    for (const m of text.matchAll(/(["'`])([^"'`\n]*)\1/g)) {
      const cls = m[2];
      const raw = cls.split(/\s+/).filter(Boolean);
      const words = raw.map((w) => w.replace(/^(dark|sm|md|lg|@\w+):/, ""));
      const has = (re: RegExp) => words.some((w) => re.test(w));
      const light = raw.filter((w) => !/^(dark|hover|focus|group-hover):/.test(w)).map((w) => w.replace(/^(sm|md|lg|@\w+):/, ""));
      const lightHas = (re: RegExp) => light.some((w) => re.test(w));
      if (has(/^(absolute|fixed|inset-0|animate-pulse)$/) || has(/dvh/)) continue;
      let why: string | null = null;
      if (has(/^bg-gradient-to-/) && !has(/^rounded-full$/) && !has(/^bg-clip-text$/)) why = "gradient panel";
      else if (has(/^rounded-(md|lg|xl|2xl|3xl)$/) && (has(/^shadow-(md|lg|xl|2xl)$/) || has(/^border-2$/))) why = "raised card";
      else if (has(/^rounded-(lg|xl|2xl)$/) && has(/^p[xy]?-([3-9]|1\d)$/) && has(FILL)) why = "filled tile";
      else if (!has(/^rounded-full$/) && lightHas(SOLID) && (lightHas(/^text-white$/) || lightHas(/^px?-([2-9]|1\d)$/))) why = "saturated panel";
      else if (lightHas(TINT) && lightHas(HUE_BORDER)) why = "tinted panel";
      if (why) found.push(`${rel}:${text.slice(0, m.index).split("\n").length}  ${why}  ${cls.slice(0, 90)}`);
    }
  }
  return found;
}

const all = sources(ROOT);
const frameDirs = new Set(all.filter((f) => FRAME.test(fs.readFileSync(f, "utf8"))).map((f) => path.dirname(f)));
const inFrame = all
  .filter((f) => frameDirs.has(path.dirname(f)) && path.dirname(f) !== ROOT && !NOT_IN_FRAME.test(path.basename(f)))
  .map((file) => ({ rel: path.relative(ROOT, file), text: fs.readFileSync(file, "utf8") }));

describe("no card inside a block's frame", () => {
  it("finds the blocks (the scan is not empty)", () => {
    expect(frameDirs.size).toBeGreaterThanOrEqual(15);
    expect(inFrame.length).toBeGreaterThanOrEqual(30);
    for (const rel of ["progress/ProgressTrackerBlock.tsx", "troubleshooting/TroubleshootingBlock.tsx", "cooking-recipes/cookingRecipeDisplay.tsx", "decision-tree/DecisionTreeBlock.tsx"]) {
      expect(inFrame.map((f) => f.rel)).toContain(rel);
    }
  });

  it("no block draws a gradient panel, a raised card or a filled tile inside its frame", () => {
    expect(cardsInsideTheFrame(inFrame)).toEqual([]);
  });

  it("the rule catches the review-4 hero card and stat tile (self-test)", () => {
    const hero = `<div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 rounded-xl p-4 sm:p-6">`;
    const tile = `<div className="bg-textured/50 rounded-lg p-3 border border-blue-200">`;
    const raised = "<div className={`bg-textured rounded-xl shadow-lg border-2 ${c}`}>";
    const bar = `<div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />`;
    const row = `<div className="rounded-md border border-border p-3">`;
    // Review 4's live decision tree: the blue question banner, the purple action row, an icon tile.
    const banner = `return "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600";`;
    const tinted = `: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-300";`;
    const iconTile = `<div className="p-2 bg-indigo-500 dark:bg-indigo-600 rounded-lg flex-shrink-0">`;
    const singleQuoted = `<div className={cn('bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-2xl', p)}>`;
    // Quiet: the system's own fill, a status dot, a pill tint without a hue border, a dark-mode twin alone.
    const primary = `<button className="rounded-md bg-primary px-2 text-primary-foreground">`;
    const dot = `<span className="h-2 w-2 rounded-full bg-green-500" />`;
    const pill = `<span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-600" />`;
    const quietActive = `"border border-primary bg-muted/40 text-foreground"`;
    const got = cardsInsideTheFrame([
      { rel: "x.tsx", text: [hero, tile, raised, bar, row, banner, tinted, iconTile, singleQuoted, primary, dot, pill, quietActive].join("\n") },
    ]);
    expect(got.map((g) => g.split("  ")[1])).toEqual([
      "gradient panel",
      "filled tile",
      "raised card",
      "saturated panel",
      "tinted panel",
      "saturated panel",
      "gradient panel",
    ]);
  });
});
