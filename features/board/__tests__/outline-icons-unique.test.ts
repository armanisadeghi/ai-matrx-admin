/**
 * V-6 (final review 2026-10-18): the outline drew Overview (the cover) and Assets (a note) with the same
 * book icon, and the top board and its Files page with the same file icon. Each now has its own:
 * the cover its type icon, a note chapter `NOTE_CHAPTER_ICON`, the top board `TOP_PAGE_ICON`, a page
 * under it `CHILD_PAGE_ICON` — none shared with each other or with a section look.
 */
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COVER_ITEMS } from "../items/cover-items";
import { LOOK_ICON, NOTE_CHAPTER_ICON, chapterIconName, pageIconName, tileIconHint } from "../engine/tile-chrome";

jest.mock("@ai-matrx/chat/ui/markdown-stream/MarkdownStream", () => ({ __esModule: true, default: () => null }));
jest.mock("@ai-matrx/records-ui/html-frame", () => ({ HtmlSampleFrame: () => null }));
jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: () => null }));

const byName = (name: string): LucideIcon => {
  const icon = (Lucide as unknown as Record<string, LucideIcon>)[name];
  expect(icon).toBeDefined();
  return icon;
};

describe("the outline never draws two kinds of thing with one icon", () => {
  it("the design-system board's chapters and pages each get their own icon", () => {
    const cover = COVER_ITEMS[0].icon;
    const note = byName(chapterIconName({}, [tileIconHint({ kind: "entity", entity: "note" }), "type:note"]));
    const text = byName(chapterIconName({}, [tileIconHint({ kind: "text" })]));
    const looks = ["color_pair", "type_style", "measure_spacing", "measure_radius", "shadow", "opacity", "motion", "html_sample"].map(
      (look) => byName(LOOK_ICON[look]),
    );
    const topPage = byName(pageIconName({ parentId: null }));
    const childPage = byName(pageIconName({ parentId: "top" }));

    const chapters = [cover, note, ...looks];
    expect(new Set(chapters).size).toBe(chapters.length);
    expect(text).toBe(byName(NOTE_CHAPTER_ICON));
    expect(topPage).not.toBe(childPage);
    for (const page of [topPage, childPage]) expect(chapters).not.toContain(page);
  });
});
