// ONE "Design system board" IN EVERY GALLERY (Arman 2026-10-21, smart-add-brand VISION Part 30): the ten design
// starters are published reference-only (`board.listed: false`) for the AI and "Start from a style", and never
// appear as gallery entries. SUT: the signed-in listing door (`listSpaceTemplates`, behind the Board gallery, the
// Start panel and the Spaces gallery) and the public one (`publicCards`), over the committed packs' card faces as
// published. RED before: every door listed all eleven design packs.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

const DIR = join(__dirname, "..", "..", "spaces", "templates", "packs");
const DESIGN = readdirSync(DIR).filter((f) => f === "design-system-board.pack.json" || f.startsWith("design-starter-"));
const CARDS = DESIGN.map((f) => {
  const pack = JSON.parse(readFileSync(join(DIR, f), "utf8")) as SpaceTemplatePack;
  return { id: `id-${pack.catalogueId}`, catalogue_id: pack.catalogueId, scope: "platform", owner_organization_id: null, space: packCardFace(pack) };
});

// The listing door's module pulls the install host; only its card read is under test here.
jest.mock("@/features/spaces/data/install-host", () => ({}));
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ schema: () => ({ rpc: async () => ({ data: { cards: CARDS }, error: null }) }) }),
}));

import { listSpaceTemplates } from "@/features/spaces/templates/use-pack";
import { publicCards } from "@/features/make/gallery/publicGallery";
import type { GalleryCard } from "@/features/make/gallery/catalogue";

describe("one Design system board in every gallery", () => {
  it("the committed design packs are the base board and ten starters", () => {
    expect(CARDS).toHaveLength(11);
  });

  it.each(["board", "any"] as const)("the %s gallery lists the base board and no starter", async (makes) => {
    const listed = await listSpaceTemplates(null, makes);
    expect(listed.map((c) => c.catalogue_id)).toEqual(["SP0363"]);
    expect(listed[0].space.board?.title).toBe("Design system");
  });

  it("the starters stay readable as reference (Start from a style, the Conductor)", async () => {
    const ref = await listSpaceTemplates(null, "reference");
    expect(ref.map((c) => c.catalogue_id).sort()).toEqual(CARDS.map((c) => c.catalogue_id).filter((id) => id !== "SP0363").sort());
  });

  it("the public gallery lists the base board and no starter", () => {
    expect(publicCards(CARDS as unknown as GalleryCard[]).map((c) => c.catalogue_id)).toEqual(["SP0363"]);
  });
});
