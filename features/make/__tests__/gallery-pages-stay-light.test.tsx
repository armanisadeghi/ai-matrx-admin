// features/make/__tests__/gallery-pages-stay-light.test.tsx — GALLERY-PERF (2026-10-19).
//
// THE USE CASE. Dana opens aimatrx.com/templates on her phone over a weak signal. The page must paint fast: every
// element the server draws ships twice (the HTML and the RSC payload), and the gallery used to draw 143 pictured
// cards (/templates 1.58 MB) while each template page shipped its whole spec and page pack as client props (789 KB).
//
// SUT: the public pages (app/(public)/templates: index, workspaces/<category>, <slug>) run for real over a catalog
// the size of the live one (1,000+ cards built from the library's own pack files), rendered to HTML. Replaced: only
// the door's answer and the browser-only islands — the Space preview island is captured so its props can be weighed.
// BREAKS THIS CATCHES (each RED on the pre-GALLERY-PERF pages): the hub drawing every category's pictured cards ·
// a list page drawing every card with no ?page= · a thumbnail's cells each carrying their own long class list ·
// the template page handing the preview island its spec, pack or sample rows as props.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import cardsFixture from "./fixtures/clone-template-cards.json";
import type { GalleryCard, GalleryThumb } from "../gallery/catalogue";
import { packCardFace, type SpaceTemplateCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

const packOf = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "spaces", "templates", "packs", `${file}.pack.json`), "utf8")) as SpaceTemplatePack;
const TABLE = (cardsFixture as unknown as GalleryCard[]).find((c) => c.catalogue_id === "T0001")!;
const PACKS = ["plumbing-company-hq", "projects-and-tasks", "sales-crm", "meeting-notes", "habit-tracker", "team-wiki-company-home"].map(packOf);
const THUMB: GalleryThumb = {
  table: "Jobs",
  columns: [
    { key: "name", label: "Name", type: "text", colors: null },
    { key: "status", label: "Status", type: "select", colors: { Scheduled: "blue", Done: "green" } },
    { key: "due", label: "Due", type: "date", colors: null },
  ],
  rows: [
    { name: "Water heater swap at the Alvarez house", status: "Scheduled", due: "2026-10-21" },
    { name: "Annual furnace check, Pine Street duplex", status: "Done", due: "2026-10-12" },
    { name: "Leak under the kitchen sink, unit 4B", status: "Scheduled", due: "2026-10-23" },
    { name: "Replace shutoff valve, Corner Bakery", status: "Done", due: "2026-10-02" },
  ],
  view: "kanban",
};
const CATEGORIES: Array<SpaceTemplateCardFace["category"]> = ["projects", "sales", "trades", "personal", "marketing", "healthcare", "legal", "retail", "education", "tech"];
const INDUSTRIES = ["healthcare", "legal_professional", "construction_trades", "retail_ecommerce", "education", "software_it"];
// A catalog the size of the live one: 400 workspaces across 10 categories and 800 single tables across 6 industries.
const SPACES: GalleryCard[] = Array.from({ length: 400 }, (_, i) => {
  const p = PACKS[i % PACKS.length];
  const face = packCardFace(p);
  return {
    ...TABLE,
    id: `5e000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    catalogue_id: i < PACKS.length ? p.catalogueId : `SPX${i}`,
    slug: i < PACKS.length ? p.spec.id : `${p.spec.id}-${i}`,
    name: p.title,
    thumb: THUMB,
    space: { ...face, title: `${face.title} ${i}`, category: CATEGORIES[i % CATEGORIES.length] },
  };
});
const TABLES: GalleryCard[] = Array.from({ length: 800 }, (_, i) => ({
  ...TABLE,
  id: `7a000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  catalogue_id: `TX${i}`,
  slug: `table-template-${i}`,
  name: `${TABLE.name} ${i}`,
  industry: INDUSTRIES[i % INDUSTRIES.length],
  thumb: THUMB,
}));
const CARDS = [...SPACES, ...TABLES];
const PLUMBING = PACKS[0];

jest.mock("../gallery/publicCatalogue.server", () => {
  const { readPublicCatalogueWith } = jest.requireActual("../gallery/publicGallery") as typeof import("../gallery/publicGallery");
  const read = () =>
    readPublicCatalogueWith(async (offset: number) => ({ data: { total: CARDS.length, limit: 200, offset, cards: CARDS.slice(offset, offset + 200) }, error: null }));
  const api = {
    readPublicCatalogue: read,
    readPublicCatalogueFresh: read,
    readTemplatePage: async (key: string) => {
      const card = SPACES.find((c) => c.slug === key);
      if (!card) return null;
      const { spec, ...pack } = PLUMBING;
      return { card, spec, pack, updatedAt: null };
    },
  };
  // ADVERSARIAL-5 F3: the page reads its state (open / missing / unavailable); answered from the same fake.
  return {
    ...api,
    readTemplatePageState: async (key: string) => {
      const page = await api.readTemplatePage(key);
      return page ? { state: "open", page } : { state: "missing" };
    },
  };
});
jest.mock("next/navigation", () => ({ ...jest.requireActual("next/navigation"), useRouter: () => ({ replace: () => undefined }) }));
// The preview island: draws its outlines like the real one and keeps the props it was handed, to weigh them.
const previewProps: Array<Record<string, unknown>> = [];
jest.mock("@/features/spaces/public/TemplatePackPreview", () => ({
  TemplatePackPreview: (props: { outlines: Record<string, React.ReactNode> } & Record<string, unknown>) => {
    previewProps.push(props);
    return <div data-space-template-preview="">{Object.values(props.outlines)}</div>;
  },
}));
jest.mock("@/features/spaces/public/SpaceTemplateIcon", () => ({ SpaceTemplateIcon: () => null, SpaceTemplateCover: () => null }));
jest.mock("../gallery/TemplateLivePreview", () => ({ TemplateLivePreview: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../gallery/TemplateUseAction", () => ({
  TemplateUseAction: () => <a>Use this template</a>,
  SpaceTemplateUseAction: () => <a>Use this template</a>,
  OwnTemplateFallback: () => <p>Own template</p>,
}));

// eslint-disable-next-line import/first -- the pages must load after the read is wired
import PublicTemplatesPage from "@/app/(public)/templates/page";
// eslint-disable-next-line import/first
import PublicTemplatePage from "@/app/(public)/templates/[slug]/page";
// eslint-disable-next-line import/first
import WorkspaceCategoryPage from "@/app/(public)/templates/workspaces/[category]/page";
// eslint-disable-next-line import/first
import { PAGE_SIZE } from "../gallery/PublicGalleryPage";

const html = async (node: Promise<React.ReactElement>) => renderToStaticMarkup(await node);
const KB = 1024;
const cardsIn = (page: string) => page.split("data-template-thumb=").length - 1;

// Budgets for the page BODY (the shared site shell is not rendered here). Measured 2026-10-19 after the fix:
// hub ≈ 25 KB, a category page ≈ 50 KB, the plumbing template ≈ 60 KB; before it the hub body was ≈ 500 KB.
const HUB_BUDGET = 60 * KB;
const LIST_BUDGET = 90 * KB;
const TEMPLATE_BUDGET = 120 * KB;

describe("the public gallery's pages stay light at catalog scale", () => {
  it("/templates pictures only the featured row and names each category's first few as links", async () => {
    const page = await html(PublicTemplatesPage({ searchParams: Promise.resolve({}) }));
    expect(page.length).toBeLessThan(HUB_BUDGET);
    expect(cardsIn(page)).toBeLessThanOrEqual(8);
    for (const c of CATEGORIES) expect(page).toContain(`href="/templates/workspaces/${c}"`);
    expect(page).toContain('href="/templates/category/healthcare"');
  });

  it("a category page draws one page of cards and links the next, crawlably", async () => {
    const first = await html(WorkspaceCategoryPage({ params: Promise.resolve({ category: "trades" }), searchParams: Promise.resolve({}) }));
    expect(first.length).toBeLessThan(LIST_BUDGET);
    expect(cardsIn(first)).toBe(PAGE_SIZE);
    expect(first).toContain('href="/templates/workspaces/trades?page=2"');
    const second = await html(WorkspaceCategoryPage({ params: Promise.resolve({ category: "trades" }), searchParams: Promise.resolve({ page: "2" }) }));
    expect(second).toContain('rel="prev"');
    expect(second).not.toBe(first);
  });

  it("a search draws one page of results too", async () => {
    const page = await html(PublicTemplatesPage({ searchParams: Promise.resolve({ q: "plumbing" }) }));
    expect(cardsIn(page)).toBeLessThanOrEqual(PAGE_SIZE);
    expect(page.length).toBeLessThan(LIST_BUDGET);
  });

  it("a thumbnail's cells carry no class lists of their own (the frame styles them once)", async () => {
    const page = await html(WorkspaceCategoryPage({ params: Promise.resolve({ category: "trades" }), searchParams: Promise.resolve({}) }));
    const thumb = page.slice(page.indexOf("data-template-thumb="), page.indexOf("</table>", page.indexOf("data-template-thumb=")));
    expect(thumb).toContain("Water heater swap");
    expect(thumb).not.toMatch(/<t[dr] class=/);
  });

  it("the template page hands its preview island page frames only — never the spec, the pack or a sample row", async () => {
    previewProps.length = 0;
    const page = await html(PublicTemplatePage({ params: Promise.resolve({ slug: PLUMBING.spec.id }), searchParams: Promise.resolve({}) }));
    expect(page.length).toBeLessThan(TEMPLATE_BUDGET);
    expect(previewProps).toHaveLength(1);
    const { outlines, ...props } = previewProps[0];
    expect(Object.keys(props).sort()).toEqual(["catalogueId", "pages", "templateKey"]);
    const wire = JSON.stringify(props);
    expect(wire.length).toBeLessThan(4 * KB);
    const table = PLUMBING.spec.tables.find((t) => t.rows?.length && t.titleField)!;
    const sample = String(table.rows![0].values[table.titleField!]);
    expect(wire).not.toContain(sample);
    // The rows are still on the page, as server HTML a crawler reads.
    expect(page).toContain(sample.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
    expect(Object.keys(outlines as object).length).toBe(PLUMBING.pages.length);
  });
});
