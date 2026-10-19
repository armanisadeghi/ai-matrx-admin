// features/make/__tests__/every-published-space-pack-is-listed.test.ts — ADVERSARIAL-3 D3 (2026-10-19).
//
// THE USE CASE. A designer starts in Spaces (or on aimatrx.com/templates/workspaces) and looks for a design-system
// starter. The library holds 183 Space packs; the galleries showed 172, because their filter was "has pages" and the
// 11 design-system packs make a BOARD over their tables, not pages.
// SUT: the one listing test every Space gallery uses (spaceTemplateMakes: the public isSpaceCard, the signed-in
// listSpaceTemplates, the public page shape) over every committed pack's card face, as published.
// BREAKS THIS CATCHES: any gallery filter that drops a valid published pack (RED on the pages-only filter: 11 dropped).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packCardFace, spaceTemplateMakes, spaceTemplateMakesLine, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import { isSpaceCard } from "../gallery/catalogue";
import { shapeTemplatePage } from "../gallery/templatePage";

const DIR = join(__dirname, "..", "..", "spaces", "templates", "packs");
const PACKS: Array<{ file: string; pack: SpaceTemplatePack }> = readdirSync(DIR)
  .filter((f) => f.endsWith(".pack.json"))
  .flatMap((file) => {
    try {
      return [{ file, pack: JSON.parse(readFileSync(join(DIR, file), "utf8")) as SpaceTemplatePack }];
    } catch {
      return []; // a pack another lane is mid-way through writing
    }
  });

describe("every published Space pack is listed by the Space galleries", () => {
  it("the library holds page-less board packs (the case the old filter dropped)", () => {
    const boardOnly = PACKS.filter(({ pack }) => !pack.pages?.length && pack.board);
    expect(boardOnly.length).toBeGreaterThanOrEqual(11);
    // The old pages-only test drops each of them.
    for (const { pack } of boardOnly) expect((packCardFace(pack).pages ?? 0) > 0).toBe(false);
  });

  it.each(PACKS.map(({ file, pack }) => [file, pack] as const))("%s is a Space card", (_file, pack) => {
    const face = packCardFace(pack);
    expect(spaceTemplateMakes(face)).not.toBeNull();
    expect(isSpaceCard({ space: face })).toBe(true);
    expect(spaceTemplateMakesLine(face)).toMatch(/page|Board/);
  });

  it("a board pack's public page is a Space template page, not a table template", () => {
    const { pack } = PACKS.find(({ pack }) => !pack.pages?.length && pack.board)!;
    const { spec, ...rest } = pack;
    const page = shapeTemplatePage({
      card: { id: "x", catalogue_id: pack.catalogueId, space: packCardFace(pack) },
      spec: { ...spec, spacePack: rest },
      updated_at: null,
    });
    expect(page?.pack?.board).toBeTruthy();
  });

  it("a board card says it makes a board", () => {
    expect(spaceTemplateMakesLine({ pages: 0, board: { title: "B", chapters: 3, pages: 0 } })).toBe("Board");
    expect(spaceTemplateMakesLine({ pages: 0, board: { title: "B", chapters: 3, pages: 2 } })).toBe("Board · 3 pages");
    expect(spaceTemplateMakesLine({ pages: 1 })).toBe("1 page");
  });
});
