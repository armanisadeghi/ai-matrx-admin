// features/make/__tests__/public-gallery-shows-space-templates.test.tsx (Arman 2026-10-18: "Yes, public gallery").
//
// THE USE CASE. Priya leads a six-person design studio and searches for a projects workspace. Signed out, she opens
// /templates, sees a Workspaces section beside the table templates, narrows to "Projects & tasks", opens "Projects &
// Tasks", reads who it is for and what it makes (its pages, its tables), sees its real pages, and presses "Use this
// template": she signs up and lands on the in-app install of exactly that template.
//
// SUT: the public pages (app/(public)/templates: index, workspaces, workspaces/<category>, <slug>) and their read,
// run for real. Replaced: only the door's answer beneath them (a Space card built from the library's own pack file,
// features/spaces/templates/packs/projects-and-tasks.pack.json, beside a captured table card) and the two browser
// islands of the Spaces fence (the editor preview and the card icon), which draw in the browser.
//
// BREAKS THIS CATCHES: Space templates missing from /templates · a Space template drawn as a table template ·
// a category page missing a category the catalogue holds · the Space page without its pages, tables or preview ·
// "Use this template" not leading through sign-up to that template's install.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import cardsFixture from "./fixtures/clone-template-cards.json";
import type { GalleryCard } from "../gallery/catalogue";
import { packCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

const PACK = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "spaces", "templates", "packs", "projects-and-tasks.pack.json"), "utf8"),
) as SpaceTemplatePack;
const OTHER = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "spaces", "templates", "packs", "freelancer-os.pack.json"), "utf8"),
) as SpaceTemplatePack;
const ACCOUNTING = (cardsFixture as unknown as GalleryCard[]).find((c) => c.catalogue_id === "T0001")!;
const SPACE: GalleryCard = {
  ...ACCOUNTING,
  id: "5e000000-0000-4000-8000-000000000002",
  catalogue_id: PACK.catalogueId,
  version: PACK.version,
  slug: PACK.spec.id,
  name: PACK.title,
  industry: "cross_industry",
  space: packCardFace(PACK),
};
const SPACE_2: GalleryCard = { ...SPACE, id: "5e000000-0000-4000-8000-000000000300", catalogue_id: OTHER.catalogueId, slug: OTHER.spec.id, name: OTHER.title, space: packCardFace(OTHER) };

jest.mock("../gallery/publicCatalogue.server", () => {
  const { readPublicCatalogueWith } = jest.requireActual("../gallery/publicGallery") as typeof import("../gallery/publicGallery");
  const cards = () => [ACCOUNTING, SPACE, SPACE_2];
  const readPublicCatalogue = () => readPublicCatalogueWith(async (offset: number) => ({ data: { total: 3, limit: 200, offset, cards: offset ? [] : cards() }, error: null }));
  return {
    readPublicCatalogue,
    readTemplatePage: async (key: string) => {
      const card = cards().find((c) => c.slug === key || c.catalogue_id === key);
      if (!card) return null;
      if (card === SPACE) {
        const { spec, ...pack } = PACK;
        return { card, spec, pack, updatedAt: null };
      }
      return { card, spec: { id: card.catalogue_id, tables: [], views: [], forms: [], extras: [] }, pack: null, updatedAt: null };
    },
  };
});

// The Spaces fence's browser islands: the editor preview draws its pages here as their titles, the icon as nothing.
jest.mock("@/features/spaces/public/TemplatePackPreview", () => ({
  TemplatePackPreview: ({ template, outlines }: { template: { catalogue_id: string; pack: { pages: Array<{ key: string; title: string }> } }; outlines: Record<string, React.ReactNode> }) => (
    <div data-space-template-preview={template.catalogue_id}>
      {template.pack.pages.map((p) => (
        <section key={p.key}>
          <button>{p.title}</button>
          {outlines[p.key]}
        </section>
      ))}
    </div>
  ),
}));
// The table templates' live preview loads records-ui in the browser; its server HTML is its children.
jest.mock("../gallery/TemplateLivePreview", () => ({ TemplateLivePreview: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("@/features/spaces/public/SpaceTemplateIcon", () => ({ SpaceTemplateIcon: () => null }));
jest.mock("../gallery/TemplateUseAction", () => ({
  TemplateUseAction: ({ signUpHref }: { signUpHref: string }) => <a href={signUpHref}>Use this template</a>,
  SpaceTemplateUseAction: ({ signUpHref }: { signUpHref: string }) => <a href={signUpHref}>Use this template</a>,
  OwnTemplateFallback: () => <p>This template is not in the gallery</p>,
}));

// eslint-disable-next-line import/first -- the pages must load after the read is wired
import PublicTemplatesPage from "@/app/(public)/templates/page";
// eslint-disable-next-line import/first
import PublicTemplatePage, { generateMetadata } from "@/app/(public)/templates/[slug]/page";
// eslint-disable-next-line import/first
import WorkspaceTemplatesPage from "@/app/(public)/templates/workspaces/page";
// eslint-disable-next-line import/first
import WorkspaceCategoryPage from "@/app/(public)/templates/workspaces/[category]/page";

const html = async (node: Promise<React.ReactElement>) => renderToStaticMarkup(await node);
const slugHref = `href="/templates/${PACK.spec.id}"`;

describe("Space templates on the public gallery", () => {
  it("shows a Workspaces section on /templates beside the table templates", async () => {
    const page = await html(PublicTemplatesPage({ searchParams: Promise.resolve({}) }));
    expect(page).toContain("data-public-templates-workspaces");
    expect(page).toContain(">Workspaces</h2>");
    expect(page).toContain(slugHref);
    expect(page).toContain(PACK.description.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
    expect(page).toContain('href="/templates/workspaces"');
    expect(page).toContain('href="/templates/workspaces/projects"');
    expect(page).toContain(`href="/templates/workspaces/${OTHER.category}"`);
    // Still the table templates, and the Space card is drawn once, as a workspace.
    expect(page).toContain('href="/templates/T0001"');
    expect(page.split(slugHref).length - 1).toBe(1);
  });

  it("lists every workspace and each category the catalogue holds", async () => {
    expect(await html(WorkspaceTemplatesPage())).toContain(slugHref);
    const category = await html(WorkspaceCategoryPage({ params: Promise.resolve({ category: "projects" }) }));
    expect(category).toContain("Projects &amp; tasks workspaces");
    expect(category).toContain(slugHref);
    expect(category).not.toContain('href="/templates/T0001"');
    expect(category).not.toContain(`href="/templates/${OTHER.spec.id}"`);
  });
});

describe("one Space template's public page", () => {
  it("says what it is, who it is for, what it makes, shows its pages, and leads Use this template through sign-up", async () => {
    const page = await html(PublicTemplatePage({ params: Promise.resolve({ slug: PACK.spec.id }), searchParams: Promise.resolve({}) }));
    expect(page).toContain("data-public-space-template");
    expect(page).toContain(`>${PACK.title.replace(/&/g, "&amp;")}</h1>`);
    expect(page).toContain(PACK.forWho);
    for (const p of PACK.pages) expect(page).toContain(p.title.replace(/&/g, "&amp;"));
    for (const t of PACK.spec.tables) expect(page).toContain(t.name);
    expect(page).toContain(`data-space-template-preview="${PACK.catalogueId}"`);
    // The first paint draws each database block as a real table of its sample rows, never a placeholder.
    const projects = PACK.spec.tables.find((t) => t.token === "project")!;
    const firstTitle = String(projects.rows![0].values[projects.titleField!]);
    expect(page).toContain('data-space-outline-table="project"');
    expect(page).toContain(`>${firstTitle.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")}<`);
    expect(page).not.toContain("[database]");
    expect(page).toContain(`href="/sign-up?redirectTo=${encodeURIComponent(`/spaces/use-template?template=${PACK.catalogueId}`)}"`);
  });

  it("carries the template's own title, description and social image for search engines", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: PACK.spec.id }), searchParams: Promise.resolve({}) });
    expect(String(meta.title)).toContain(PACK.title);
    expect(String(meta.description)).toContain(PACK.description.slice(0, 30));
    expect(JSON.stringify(meta.openGraph)).toContain(`/templates/${PACK.spec.id}/social-image`);
  });
});
