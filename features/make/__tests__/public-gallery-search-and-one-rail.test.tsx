// features/make/__tests__/public-gallery-search-and-one-rail.test.tsx — GALLERY-UX (ADVERSARIAL-2, bar notion.com/templates).
//
// THE USE CASE. Marco runs a plumbing company. Signed out, he opens /templates, types "plumber" in the search box and
// gets Plumbing Company HQ — a link he can send his partner (?q=plumber). The gallery leads with a hand-picked
// featured row, has one category rail (no second industry rail), and every workspace card shows a picture of its
// table. A mistyped template address is a real 404 with the gallery one click away; an old address redirects.
//
// SUT: the public pages (app/(public)/templates: index, workspaces, workspaces/<category>, <slug>) run for real over
// cards built from the library's own pack files. Replaced: only the door's answer and the browser-only islands.
// BREAKS THIS CATCHES (each RED on the pre-GALLERY-UX pages): no search box · "plumber" finding nothing · featured =
// first six alphabetically · an industry rail beside the category rail · a card with no picture · an unknown slug
// answering 200 · a former slug not redirecting · a named category 404ing · a double-separator page title.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import cardsFixture from "./fixtures/clone-template-cards.json";
import type { GalleryCard, GalleryThumb } from "../gallery/catalogue";
import { packCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

const packOf = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, "..", "..", "spaces", "templates", "packs", `${file}.pack.json`), "utf8")) as SpaceTemplatePack;
const TABLE = (cardsFixture as unknown as GalleryCard[]).find((c) => c.catalogue_id === "T0001")!;
const THUMB: GalleryThumb = { table: "Jobs", columns: [{ key: "name", label: "Name", type: "text", colors: null }], rows: [{ name: "Water heater swap" }], view: null };
const FILES = ["accounting-firm-desk", "habit-tracker", "meeting-notes", "plumbing-company-hq", "projects-and-tasks", "sales-crm", "team-wiki-company-home"];
const PACKS = FILES.map(packOf);
const SPACES: GalleryCard[] = PACKS.map((p, i) => ({
  ...TABLE,
  id: `5e000000-0000-4000-8000-00000000000${i}`,
  catalogue_id: p.catalogueId,
  version: p.version,
  slug: p.spec.id,
  name: p.title,
  industry: "cross_industry",
  thumb: THUMB,
  space: packCardFace(p),
}));
const CARDS = [TABLE, ...SPACES];
const SALES = SPACES.find((c) => c.catalogue_id === "SP0150")!;

jest.mock("../gallery/publicCatalogue.server", () => {
  const { readPublicCatalogueWith } = jest.requireActual("../gallery/publicGallery") as typeof import("../gallery/publicGallery");
  const read = () => readPublicCatalogueWith(async (offset: number) => ({ data: { total: CARDS.length, limit: 200, offset, cards: offset ? [] : CARDS }, error: null }));
  return {
    readPublicCatalogue: read,
    readPublicCatalogueFresh: read,
    readTemplatePage: async (key: string) => {
      const card = CARDS.find((c) => c.slug === key || c.catalogue_id === key || c.space?.formerSlugs?.includes(key));
      if (!card) return null;
      const pack = PACKS.find((p) => p.catalogueId === card.catalogue_id);
      if (pack) {
        const { spec, ...rest } = pack;
        return { card, spec, pack: rest, updatedAt: null };
      }
      return { card, spec: { id: card.catalogue_id, tables: [], views: [], forms: [], extras: [] }, pack: null, updatedAt: null };
    },
  };
});
jest.mock("next/navigation", () => {
  const fail = (digest: string) => {
    const e = new Error(digest) as Error & { digest: string };
    e.digest = digest;
    throw e;
  };
  return {
    notFound: () => fail("NEXT_HTTP_ERROR_FALLBACK;404"),
    permanentRedirect: (to: string) => fail(`NEXT_REDIRECT;replace;${to};308;`),
    useRouter: () => ({ replace: () => undefined }),
  };
});
jest.mock("@/features/spaces/public/TemplatePackPreview", () => ({ TemplatePackPreview: () => <div data-space-template-preview="" /> }));
jest.mock("@/features/spaces/public/SpaceTemplateIcon", () => ({ SpaceTemplateIcon: () => null }));
jest.mock("../gallery/TemplateLivePreview", () => ({ TemplateLivePreview: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../gallery/TemplateUseAction", () => ({
  TemplateUseAction: () => <a>Use this template</a>,
  SpaceTemplateUseAction: () => <a>Use this template</a>,
  OwnTemplateFallback: () => <p data-own-template="">Own template</p>,
}));

// eslint-disable-next-line import/first -- the pages must load after the read is wired
import PublicTemplatesPage from "@/app/(public)/templates/page";
// eslint-disable-next-line import/first
import PublicTemplatePage, { generateMetadata } from "@/app/(public)/templates/[slug]/page";
// eslint-disable-next-line import/first
import WorkspaceCategoryPage from "@/app/(public)/templates/workspaces/[category]/page";

const html = async (node: Promise<React.ReactElement>) => renderToStaticMarkup(await node);
const hub = (q?: string) => html(PublicTemplatesPage({ searchParams: Promise.resolve(q === undefined ? {} : { q }) }));
const digestOf = async (p: Promise<unknown>) => p.then(() => "rendered", (e: { digest?: string }) => e.digest ?? String(e));

describe("the public gallery searches, leads with featured templates and has one category rail", () => {
  it("has a search box that sends ?q= to the page itself", async () => {
    const page = await hub();
    const form = page.match(/<form[^>]*>/)?.[0] ?? "";
    expect(form).toContain('action="/templates"');
    expect(form).toContain('method="get"');
    expect(form).toContain('role="search"');
    expect(page).toContain('name="q"');
  });

  it("?q=plumber answers Plumbing Company HQ, server-rendered, and nothing unrelated", async () => {
    const page = await hub("plumber");
    expect(page).toContain(`href="/templates/${packOf("plumbing-company-hq").spec.id}"`);
    expect(page).not.toContain(`href="/templates/${packOf("habit-tracker").spec.id}"`);
    expect(page).toContain('data-public-templates-results="1"');
    expect(page).toContain(`1 of ${CARDS.length} templates`);
  });

  it("?q=accountant finds the accounting workspace; a nonsense query says so and offers everything", async () => {
    expect(await hub("accountant")).toContain(`href="/templates/${packOf("accounting-firm-desk").spec.id}"`);
    const none = await hub("zzzqqq");
    expect(none).toContain("data-public-templates-no-match");
    expect(none).toContain('href="/templates"');
  });

  it("featured is the hand-picked list in its order, not alphabetical", async () => {
    const page = await hub();
    const featured = page.slice(page.indexOf("data-public-templates-featured"), page.indexOf("</ul>", page.indexOf("data-public-templates-featured")));
    const order = [...featured.matchAll(/data-make-gallery-card="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["SP0002", "SP0150", "SP0101", "SP0003", "SP0202"]);
  });

  it("has ONE category rail (no industry or job rail), with the table template's industry filed under a category", async () => {
    const page = await hub();
    expect(page.split("data-public-templates-categories").length - 1).toBe(1);
    expect(page).not.toContain("data-public-templates-industries");
    expect(page).not.toContain("data-public-templates-jobs");
    // T0001 is legal_professional → Legal.
    expect(page).toContain('href="/templates/workspaces/legal"');
  });

  it("every workspace card shows a picture of its table, drawn on the server", async () => {
    const page = await hub();
    const cards = page.split('data-space-card-picture=""').length - 1;
    expect(cards).toBeGreaterThanOrEqual(SPACES.length);
    expect(page).toContain("data-template-thumb");
    expect(page).toContain("Water heater swap");
  });

  it("carries CollectionPage JSON-LD naming the featured templates", async () => {
    const page = await hub();
    expect(page).toContain('"@type":"CollectionPage"');
    expect(page).toContain(`/templates/${SALES.slug}`);
  });
});

describe("addresses", () => {
  it("an unknown template address is a real 404; a template id still opens an organization's own template", async () => {
    expect(await digestOf(PublicTemplatePage({ params: Promise.resolve({ slug: "no-such-template" }), searchParams: Promise.resolve({}) }))).toBe(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    const own = await html(PublicTemplatePage({ params: Promise.resolve({ slug: "0b9b8c1e-1111-4222-8333-944455556666" }), searchParams: Promise.resolve({}) }));
    expect(own).toContain("data-own-template");
  });

  it("a former slug redirects permanently (308) to the readable one", async () => {
    expect(SALES.slug).toBe("spaces-sales-crm");
    expect(await digestOf(PublicTemplatePage({ params: Promise.resolve({ slug: "spaces-sp0150" }), searchParams: Promise.resolve({}) }))).toBe(
      "NEXT_REDIRECT;replace;/templates/spaces-sales-crm;308;",
    );
  });

  it("a category the library names never 404s; an unknown empty one does", async () => {
    expect(await digestOf(WorkspaceCategoryPage({ params: Promise.resolve({ category: "manufacturing" }), searchParams: Promise.resolve({}) }))).toBe("rendered");
    expect(await digestOf(WorkspaceCategoryPage({ params: Promise.resolve({ category: "nonsense" }), searchParams: Promise.resolve({}) }))).toBe(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("a template's title has one separator", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: SALES.slug! }), searchParams: Promise.resolve({}) });
    expect(String(meta.title)).toContain("Sales CRM template");
    expect(String(meta.title)).not.toContain("|");
  });
});
