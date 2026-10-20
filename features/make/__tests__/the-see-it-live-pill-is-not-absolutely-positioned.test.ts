// features/make/__tests__/the-see-it-live-pill-is-not-absolutely-positioned.test.ts — TEMPLATE-UI-POLISH (2026-10-20).
//
// THE USE CASE. A developer opens a template page and the dev overlay shows a red "1 Issue": the tap-target pill guard reported
// "pill ink is off-centre" on "See it live". The guard skips the text of an element that is itself `position: absolute`, so it
// measured only the icon. The element is fixed (the position sits on a wrapper; the icon carries the glyph trim), not the guard.
// RED on the prior bytes: both See-it-live buttons carried `absolute` themselves and no `matrx-glyph-trim`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = ["features/make/gallery/TemplateLivePreview.tsx", "features/spaces/public/TemplatePackPreview.tsx"];

describe.each(FILES)("%s", (file) => {
  const src = readFileSync(join(__dirname, "../../..", file), "utf8");
  const button = src.slice(src.lastIndexOf("<button", src.indexOf("data-see-it-live")), src.indexOf("</button>", src.indexOf("data-see-it-live")));
  it("the See it live button is not itself absolutely positioned", () => {
    expect(button).toContain("data-see-it-live");
    expect(button).not.toMatch(/\b(absolute|fixed)\b/);
  });
  it("its icon carries the optical glyph trim so ink sits evenly", () => {
    expect(button).toContain("matrx-glyph-trim");
  });
});
