/**
 * Page layout: chapter filing, a column of cards, no tile scrolling inside itself (2026-10-18).
 *
 * SUT: `engine/page-layout.ts` `planPageLayout` / `pageMembership`, `templates/board-pack-plan.ts`
 * (a template files each tile in its chapter), `templates/clone-content.ts` (the filing follows a cloned
 * frame), `engine/tile-chrome.ts` (`frameMembers`, `autoHeightMoves`, `innerOverflow`, `tileChrome`), the
 * catalog's `autoHeight` for the note and the write-up.
 *
 * Breaks it catches (live walk of a fresh "Design system" board): the Components table filed into the
 * Assets chapter — a section that grew (or was narrowed and grew) over the next chapter's frame was
 * refiled by its center the next time the page opened, because the filing lived only in the session's
 * memory; two tiles flowed side by side in one chapter at a stale narrow width (224px, the 240px
 * minimum column) instead of stacking at the chapter's width; the Assets note scrolling inside its tile.
 */

jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ from: () => ({}) }) } }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import { frameOf } from "../engine/arrange";
import { PAGE_FRAME_PAD, pageColumnWidth, planPageLayout, type PageMove, type PagePlaced } from "../engine/page-layout";
import { autoHeightMoves, frameMembers, growStep, innerSlack, tileChrome } from "../engine/tile-chrome";
import { planPackBoards } from "../templates/board-pack-plan";
import { cloneBoardContent } from "../templates/clone-content";
import { itemTypeFor } from "../items/catalog";

const PACK = JSON.parse(readFileSync(join(__dirname, "../../spaces/templates/packs/design-system-board.pack.json"), "utf8")) as SpaceTemplatePack;
const MADE = Object.fromEntries(
  ["color", "type_style", "spacing", "radius", "shadow", "opacity", "motion", "component"].map((t, i) => [t, { tableId: `t-${i}`, viewIds: {} }]),
);

type Scene = { tiles: PagePlaced[]; frames: PagePlaced[] };
function applied(scene: Scene, moves: readonly PageMove[]): Scene {
  const at = new Map(moves.map((m) => [m.id, m]));
  const move = <Q extends PagePlaced>(q: Q): Q => {
    const m = at.get(q.id);
    return m ? { ...q, rect: { x: m.x, y: m.y, w: m.w ?? q.rect.w, h: m.h ?? q.rect.h } } : q;
  };
  return { tiles: scene.tiles.map(move), frames: scene.frames.map(move) };
}

/**
 * The live board's saved state, reduced: the Components section grew to its content and its frame grew
 * with it (`autoHeightMoves`), over the Assets chapter's frame, and the page had not re-flowed yet when the
 * board was saved. The section's center sits inside BOTH frames; the smaller one (Assets) wins by geometry.
 */
function grownOverNext(withFiling: boolean): Scene {
  const frames: PagePlaced[] = [
    { id: "f:components", rect: { x: 0, y: 0, w: 1100, h: 3616 }, title: "Components" },
    { id: "f:assets", rect: { x: 0, y: 1732, w: 1100, h: 1000 }, title: "Assets" },
  ];
  const tiles: PagePlaced[] = [
    { id: "components", rect: { x: 8, y: 8, w: 1084, h: 3600 }, title: "Components", ...(withFiling ? { chapter: "f:components" } : {}) },
    { id: "assets", rect: { x: 8, y: 1740, w: 1084, h: 280 }, title: "Assets", ...(withFiling ? { chapter: "f:assets" } : {}) },
  ];
  return { tiles, frames };
}

describe("chapter filing", () => {
  it("a grown section's CENTER sits in the next chapter (the defect's mechanism: the old filing read the center)", () => {
    const scene = grownOverNext(false);
    const tile = scene.tiles.find((t) => t.id === "components")!;
    expect(frameOf(tile.rect, scene.frames)).toBe("f:assets");
    // Filing by place now reads the top edge, which growing never moves.
    expect(planPageLayout(scene).members.get("components")).toBe("f:components");
  });

  it("a tile filed in its chapter stays there however it grew, with no session memory (a reload)", () => {
    const scene = grownOverNext(true);
    const plan = planPageLayout(scene);
    expect(plan.members.get("components")).toBe("f:components");
    expect(plan.members.get("assets")).toBe("f:assets");
    const after = applied(scene, plan.moves);
    const comp = after.frames.find((f) => f.id === "f:components")!.rect;
    const assets = after.frames.find((f) => f.id === "f:assets")!.rect;
    expect(assets.y).toBeGreaterThan(comp.y + comp.h);
    // The labels and icons read the same filing.
    const members = frameMembers(
      after.frames.map((f) => ({ ...f, title: f.title ?? "" })),
      after.tiles.map((t) => ({ ...t, title: t.title ?? "" })),
    );
    expect(members.get("f:components")).toEqual(["components"]);
    expect(members.get("f:assets")).toEqual(["assets"]);
  });

  it("an auto-height write grows the tile's FILED frame, not a smaller frame it now overlaps", () => {
    const { frames } = grownOverNext(true);
    const moves = autoHeightMoves({ x: 8, y: 8, w: 1084, h: 3600 }, "components", 4000, frames, "f:components");
    expect(moves.map((m) => m.id)).toEqual(["components", "f:components"]);
  });

  it("a tile the person moved is refiled by where they put it", () => {
    const scene = grownOverNext(true);
    const first = planPageLayout(scene);
    const settled = applied(scene, first.moves);
    const target = settled.frames.find((f) => f.id === "f:components")!.rect;
    // The person drags the Assets note into the Components chapter (its top-left leaves where the plan put it).
    const dragged: Scene = {
      ...settled,
      tiles: settled.tiles.map((t) => (t.id === "assets" ? { ...t, rect: { ...t.rect, x: 40, y: target.y + 100 } } : t)),
    };
    const next = planPageLayout(dragged, undefined, { members: first.members, placed: first.placed });
    expect(next.members.get("assets")).toBe("f:components");
    // A height change alone (growing to content) is not a move: the filing holds.
    const grown: Scene = { ...settled, tiles: settled.tiles.map((t) => (t.id === "components" ? { ...t, rect: { ...t.rect, h: 5000 } } : t)) };
    expect(planPageLayout(grown, undefined, { members: first.members, placed: first.placed }).members.get("components")).toBe("f:components");
  });

  it("switching in from the canvas files every tile by where the person put it, over its old filing", () => {
    const scene = grownOverNext(true);
    // On the canvas the person put the Assets note at the top of the Components frame.
    const moved: Scene = { ...scene, tiles: scene.tiles.map((t) => (t.id === "assets" ? { ...t, rect: { ...t.rect, y: 20 } } : t)) };
    expect(planPageLayout(moved).members.get("assets")).toBe("f:assets");
    expect(planPageLayout(moved, undefined, { byPlace: true }).members.get("assets")).toBe("f:components");
  });

  it("repairs a board saved before filing: the tile goes back to its own empty chapter (live board 0f6afaa4)", () => {
    // Stored rects of the live board (phone width): Components frame empty, Assets frame wrapping both tiles.
    const scene: Scene = {
      frames: [
        { id: "f:motion", rect: { x: 0, y: 4973, w: 598, h: 238 }, title: "Motion" },
        { id: "f:components", rect: { x: 0, y: 5227, w: 598, h: 120 }, title: "Components" },
        { id: "f:assets", rect: { x: 0, y: 5363, w: 598, h: 1635 }, title: "Assets" },
      ],
      tiles: [
        { id: "motion", rect: { x: 8, y: 4981, w: 582, h: 222 }, title: "Motion" },
        { id: "components", rect: { x: 8, y: 5371, w: 224, h: 1619 }, title: "Components" },
        { id: "assets", rect: { x: 248, y: 5371, w: 224, h: 280 }, title: "Assets" },
      ],
    };
    const plan = planPageLayout(scene, undefined, { columnW: 598 });
    expect(plan.members.get("components")).toBe("f:components");
    expect(plan.members.get("assets")).toBe("f:assets");
    expect(plan.members.get("motion")).toBe("f:motion");
    const after = applied(scene, plan.moves);
    const comp = after.frames.find((f) => f.id === "f:components")!.rect;
    const tile = after.tiles.find((t) => t.id === "components")!.rect;
    expect(tile.y).toBeGreaterThan(comp.y);
    expect(tile.y + tile.h).toBeLessThanOrEqual(comp.y + comp.h);
    // A person's own arrangement is never "repaired": switching in from the canvas files by place.
    expect(planPageLayout(scene, undefined, { byPlace: true }).members.get("components")).toBe("f:assets");
  });

  it("files an unfiled tile by its TOP edge (as the server's board reader does), not its center", () => {
    const frames: PagePlaced[] = [
      { id: "f1", rect: { x: 0, y: 0, w: 1100, h: 200 }, title: "One" },
      { id: "f2", rect: { x: 0, y: 216, w: 1100, h: 2000 }, title: "Two" },
    ];
    // Top inside f1, center far down inside f2.
    const tiles: PagePlaced[] = [{ id: "t", rect: { x: 8, y: 40, w: 1084, h: 1200 }, title: "Body" }];
    expect(planPageLayout({ frames, tiles }).members.get("t")).toBe("f1");
  });

  it("a template files every tile in its own chapter (the Design system board)", () => {
    let n = 0;
    const [top] = planPackBoards(PACK.board!, MADE, () => `id-${++n}`);
    const byTitle = new Map(top.doc.groups.map((g) => [g.title, g.id]));
    for (const node of top.doc.nodes) expect(node.chapter).toBeDefined();
    expect(top.doc.nodes.find((x) => x.title === "Components")!.chapter).toBe(byTitle.get("Components"));
    expect(top.doc.nodes.find((x) => x.title === "Assets")!.chapter).toBe(byTitle.get("Assets"));
  });

  it("a cloned board's filing follows its frames' new ids", async () => {
    let n = 0;
    const [top] = planPackBoards(PACK.board!, MADE, () => `id-${++n}`);
    const services = { copyNote: async (id: string) => ({ id: `copy-${id}` }), copyDocument: async (id: string) => ({ id: `copy-${id}` }) };
    let k = 0;
    const clone = await cloneBoardContent(top.doc, services, () => `new-${++k}`);
    const groupIds = new Set(clone.groups.map((g) => g.id));
    for (const node of clone.nodes) expect(groupIds.has(node.chapter!)).toBe(true);
    const assets = clone.groups.find((g) => g.title === "Assets")!;
    expect(clone.nodes.find((x) => x.title === "Assets")!.chapter).toBe(assets.id);
  });
});

describe("a column of cards", () => {
  it("stacks every tile in a chapter at the chapter's full inner width, never side by side", () => {
    // The live board: two tiles left at 224px (the 240px minimum column) flowed side by side in a 598 column.
    const scene: Scene = {
      frames: [{ id: "f", rect: { x: 0, y: 0, w: 598, h: 1635 }, title: "Assets" }],
      tiles: [
        { id: "components", rect: { x: 8, y: 8, w: 224, h: 1619 }, title: "Components", chapter: "f" },
        { id: "assets", rect: { x: 248, y: 8, w: 224, h: 280 }, title: "Assets", chapter: "f" },
      ],
    };
    const plan = planPageLayout(scene, undefined, { columnW: 598 });
    const after = applied(scene, plan.moves);
    const [a, b] = after.tiles;
    expect(a.rect.w).toBe(598 - PAGE_FRAME_PAD * 2);
    expect(b.rect.w).toBe(598 - PAGE_FRAME_PAD * 2);
    expect(a.rect.x).toBe(b.rect.x);
    expect(b.rect.y).toBeGreaterThanOrEqual(a.rect.y + a.rect.h);
    // A wide view puts them back at the wide chapter's width (narrowing is never one-way).
    const wide = applied(after, planPageLayout(after).moves);
    for (const t of wide.tiles) expect(t.rect.w).toBe(1100 - PAGE_FRAME_PAD * 2);
    expect(planPageLayout(wide).moves).toEqual([]);
  });

  it("never re-flows the board to a view narrower than any phone (a squeezed or hidden pane)", () => {
    const scene: Scene = {
      frames: [{ id: "f", rect: { x: 0, y: 0, w: 1100, h: 316 }, title: "Colors" }],
      tiles: [{ id: "a", rect: { x: 8, y: 8, w: 1084, h: 300 }, title: "Colors", chapter: "f" }],
    };
    // A 375 phone's usable width (after insets and margins) is its column; a 240-wide pane keeps the column.
    expect(pageColumnWidth(375, 311)).toBe(311);
    expect(pageColumnWidth(240, 176)).toBeUndefined();
    expect(pageColumnWidth(0, 1)).toBeUndefined();
    expect(pageColumnWidth(1440, 1300)).toBeUndefined();
    expect(planPageLayout(scene, undefined, { columnW: pageColumnWidth(240, 176) }).moves).toEqual([]);
  });

  it("stacks loose tiles the same way, and a drawn mark keeps its own size", () => {
    const scene: Scene = {
      frames: [],
      tiles: [
        { id: "a", rect: { x: 0, y: 0, w: 300, h: 200 } },
        { id: "b", rect: { x: 400, y: 0, w: 300, h: 200 } },
        { id: "mark", rect: { x: 800, y: 0, w: 120, h: 80 }, fixedSize: true },
      ],
    };
    const plan = planPageLayout(scene);
    const after = applied(scene, plan.moves);
    const [a, b, mark] = after.tiles;
    expect(a.rect.w).toBe(1100 - PAGE_FRAME_PAD * 2);
    expect(b.rect.y).toBeGreaterThanOrEqual(a.rect.y + a.rect.h);
    expect(mark.rect.y).toBeGreaterThanOrEqual(b.rect.y + b.rect.h);
    expect(mark.rect.w).toBe(120);
    expect(plan.moves.find((m) => m.id === "mark")!.w).toBeUndefined();
    expect(planPageLayout(after).moves).toEqual([]);
  });
});

describe("no tile scrolls inside itself in page layout", () => {
  it("the write-up lays out at its content's height and the note grows until its editor stops scrolling", () => {
    const writeUp = { kind: "text", markdown: "# Files" } as const;
    const note = { kind: "entity", entity: "note", id: null } as const;
    expect(itemTypeFor(writeUp)?.autoHeight?.(writeUp)).toBe(true);
    expect(itemTypeFor(note)?.autoHeight?.(note)).toBe("fill");
    expect(tileChrome("page", { autoHeight: "fill" })).toMatchObject({ autoHeight: false, growToFit: true });
    expect(tileChrome("canvas", { autoHeight: "fill" })).toMatchObject({ autoHeight: false, growToFit: false });
  });

  it("reads the content's own bottom: grows to hidden content, shrinks to spare room, ignores scroll-past-end padding", () => {
    const box = (clientHeight: number, contentBottom: number | null, scrollHeight = clientHeight, overflowY = "auto", capped = false) => ({
      clientHeight,
      contentBottom,
      scrollHeight,
      overflowY,
      capped,
    });
    expect(innerSlack([box(200, 900)])).toBe(700);
    // The rich editor's column carries pb-[40dvh]: its content bottom (its deepest lines) is the truth.
    expect(innerSlack([box(768, 120, 1100)])).toBe(120 - 768);
    // On a phone the note's toolbar wraps: the editor is a small part of the card, and still counts.
    expect(innerSlack([box(89, 300, 812)])).toBe(211);
    expect(innerSlack([box(200, 900, 900, "auto", true)])).toBe(0); // a code block with its own max height
    expect(innerSlack([box(28, 36, 36)])).toBe(0); // a toolbar row scrolling sideways
    expect(innerSlack([box(200, 900, 900, "hidden")])).toBe(0);
    expect(innerSlack([box(200, null, 650)])).toBe(450); // a textarea: only its scroll height tells
    expect(innerSlack([box(200, 200.5)])).toBe(0);
  });

  it("never ratchets: an overflow growing does not reveal stops the growth for good, and later content still grows it", () => {
    // A note whose editor keeps 24px of padding below a full-height child: growing never clears it.
    let floor = 0;
    let last: { hidden: number; by: number } | null = null;
    let h = 280;
    const hiddenFor = (height: number) => 24 + Math.max(0, 700 - height); // content needs 700; 24 never clears
    for (let i = 0; i < 20; i++) {
      const step = growStep(hiddenFor(h), floor, last);
      floor = step.floor;
      last = step.grow > 0 ? { hidden: step.hidden, by: step.grow } : null;
      h += step.grow;
    }
    // At most one step past the content (the first step cannot know the floor yet).
    expect(h).toBeGreaterThanOrEqual(700);
    expect(h).toBeLessThanOrEqual(700 + 2 * 24);
    const settled = h;
    // Typing adds 100px of content: it grows by that, once.
    for (let i = 0; i < 20; i++) {
      const step = growStep(24 + Math.max(0, 800 - h), floor, last);
      floor = step.floor;
      last = step.grow > 0 ? { hidden: step.hidden, by: step.grow } : null;
      h += step.grow;
    }
    expect(h).toBeGreaterThanOrEqual(800);
    expect(h - settled).toBeLessThanOrEqual(100);
  });
});
