/**
 * ONE FRAME, NEVER TWO (Block Controls decision 1; adversarial review 2026-10-19, finding 11).
 *
 * Every block that draws Controls puts them in its OWN header row, beside the host's tools ("</>", Copy),
 * through the shared header-actions slot. Reading the sources:
 *  - a block that draws its own card calls `useBlockHostSlot()` and draws `host.actions` EXACTLY once;
 *  - a block that rides a shared wrapper passes Controls to the wrapper's header props
 *    (`controls=` / `extraActions=` / `headerContent=`), never into its body;
 *  - the blocks with a hero card carry `data-block-frame`, and Controls sit after a bordered header row
 *    that comes before the body.
 * A new block with Controls that does neither fails here.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(full);
    return /\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

/** Controls passed into a wrapper's HEADER props, inline or through a variable that holds them. */
const WRAPPER_PROPS = /(?:controls|extraActions|headerContent)=\{\s*(?:<>\s*)?(?:<CopySourceButton[^>]*\/>\s*)?(?:<BlockControlsButton|headerControls\b)/;
/** BlockHeaderWrapper's `controls` is a BODY row under the title; only `extraActions` is the header. */
const HEADER_WRAPPER_PROPS = /extraActions=\{\s*<>\s*(?:<CopySourceButton[^>]*\/>\s*)?<BlockControlsButton/;
const withControls = sources(ROOT)
  .map((file) => ({ file, rel: path.relative(ROOT, file), text: fs.readFileSync(file, "utf8") }))
  .filter(({ text }) => text.includes("<BlockControlsButton"));

describe("every block with Controls draws them in its own header row", () => {
  it("finds the blocks (the scan is not empty)", () => {
    expect(withControls.length).toBeGreaterThanOrEqual(14);
  });

  for (const { rel, text } of withControls) {
    it(`${rel}: exactly one header-actions slot, Controls in the header`, () => {
      const slotUses = (text.match(/\{host\.actions\}|<BlockHostActions\b/g) ?? []).length;
      if (/useBlockHostSlot\(/.test(text)) {
        expect(slotUses).toBe(1);
        return;
      }
      // Rides a shared wrapper (they draw the slot exactly once themselves).
      expect(text).toMatch(/ChatCollapsibleWrapper|BlockHeaderWrapper|ContentBlockWrapper/);
      expect(text).toMatch(/BlockHeaderWrapper/.test(text) ? HEADER_WRAPPER_PROPS : WRAPPER_PROPS);
      expect(slotUses).toBe(0);
    });
  }
});

describe("a checklist inside the collapsible wrapper stands down so there is one header", () => {
  it("TasksBlock tells the checklist its Controls are in the wrapper's header", () => {
    const block = fs.readFileSync(path.join(ROOT, "tasks/TasksBlock.tsx"), "utf8");
    const checklist = fs.readFileSync(path.join(ROOT, "tasks/TaskChecklist.tsx"), "utf8");
    expect(block).toContain("controlsInHeader");
    expect(checklist).toMatch(/useBlockHostSlot\(!controlsInHeader\)/);
    expect(checklist).toMatch(/\{!controlsInHeader && \(\s*<div (?:data-block-header )?className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b/);
  });
});

describe("blocks with a hero card are one framed box with a header row", () => {
  const FRAMED = [
    "progress/ProgressTrackerBlock.tsx",
    "troubleshooting/TroubleshootingBlock.tsx",
    "cooking-recipes/cookingRecipeDisplay.tsx",
    "decision-tree/DecisionTreeBlock.tsx",
  ];
  for (const rel of FRAMED) {
    it(`${rel}: header row (border-b) holds Controls and the host actions, before the body`, () => {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const frame = text.indexOf("data-block-frame=");
      const header = text.indexOf("border-b border-border bg-muted/50", frame);
      const controls = text.indexOf("<BlockControlsButton", frame);
      const actions = text.indexOf("{host.actions}", frame);
      const body = text.indexOf("{/* Header Section */}", frame);
      expect(frame).toBeGreaterThan(-1);
      expect(header).toBeGreaterThan(frame);
      expect(controls).toBeGreaterThan(header);
      expect(actions).toBeGreaterThan(controls);
      expect(body).toBeGreaterThan(actions);
      // The frame is the only box: the old gradient card with its own border/shadow is gone.
      expect(text).not.toMatch(/rounded-2xl p-4 sm:p-6 shadow-lg border-2/);
      expect(text).not.toMatch(/rounded-xl p-2 border border-(orange|indigo)-200/);
      // The frame margin is the block's (my-3): no py-6 / py-2 wrapper around a second box.
      expect(text).toMatch(/`my-3 overflow-hidden rounded-lg border bg-card|: "my-3"/);
    });
  }

  it("flashcards keep one set of actions (the header's), no footer bar repeats them", () => {
    const text = fs.readFileSync(path.join(ROOT, "flashcards/FlashcardsBlock.tsx"), "utf8");
    const inWrapper = text.slice(text.indexOf("<ChatCollapsibleWrapper"), text.indexOf("</ChatCollapsibleWrapper>"));
    expect((inWrapper.match(/<FlashcardsSetControls/g) ?? []).length).toBe(1);
    expect(inWrapper).not.toContain('variant="bar"');
  });
});

/**
 * Review 2 (2026-10-19, N2 math, N3 comparison, N6 titles gone at 375px): the same rules over EVERY
 * block with Controls, found by the scan above — no hand list.
 *  - every header row wraps, so a phone drops the actions under the title instead of hiding it;
 *  - no filled header action, no "coming soon" stub, no template subtitle that can print "undefined";
 *  - a block that draws its own card has exactly one frame: no gradient hero card holding the title.
 */
function headerRows(text: string): string[] {
  const rows: string[] = [];
  for (const m of text.matchAll(/<div\b[^>]*?className=(?:"([^"]*)"|\{`([^`]*)`\})[^>]*>/g)) {
    const cls = m[1] ?? m[2] ?? "";
    const isHeader =
      /\bdata-block-header\b/.test(m[0]) ||
      (/\bjustify-between\b/.test(cls) && /\bborder-b\b/.test(cls) && /\bbg-muted\/(30|50)\b/.test(cls));
    if (isHeader) rows.push(cls);
  }
  return rows;
}

describe("every block with Controls is one quiet frame whose title always shows", () => {
  for (const { rel, text } of withControls) {
    it(`${rel}`, () => {
      for (const cls of headerRows(text)) expect(cls).toMatch(/\bflex-wrap\b/);
      expect(text).not.toMatch(/className:\s*"bg-[a-z]+-[56]00[^"]*text-white/);
      expect(text).not.toMatch(/\(coming soon\)/i);
      expect(text).not.toMatch(/subtitle=\{`\$\{/);
      if (/useBlockHostSlot\(/.test(text)) {
        // The title sits in the header row, never in a gradient hero card inside the frame.
        expect(text).not.toMatch(/<div className="bg-gradient-to-br[^"]*rounded-xl[^"]*border[^"]*">\s*<div className="flex items-start justify-between/);
      }
    });
  }
});

describe("the math block never prints undefined", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mathSubtitle } = require("../math/MathProblemBlock") as typeof import("../math/MathProblemBlock");
  it.each([
    [{ topic_name: undefined, module_name: undefined }, ""],
    [{ topic_name: "Algebra", module_name: undefined }, "Algebra"],
    [{ topic_name: "Algebra", module_name: "Linear" }, "Algebra • Linear"],
    [{ topic_name: " ", module_name: "Linear" }, "Linear"],
  ])("%j → %p", (parts, expected) => {
    expect(mathSubtitle(parts as never)).toBe(expected);
  });
});
