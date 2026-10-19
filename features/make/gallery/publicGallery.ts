// features/make/gallery/publicGallery.ts — LANE MAKE-HOME (v6), wave 4b: the public gallery's pure half.
//
// Arman, 2026-10-02: the template gallery is public and indexed. Every published platform template
// has a public page at /templates/<slug> (lane CHAIR-GALLERY, 2026-10-05: the spec's own readable id,
// unique and stable across versions) — the same page signed in or out. Signed in, "Use this template"
// installs there; a guest signs up and returns to it. Catalogue-id and version-id addresses redirect.
//
// THE DOOR (one source, G3): the same catalog door the signed-in gallery reads, `custom.templates`,
// asked for platform templates only. A signed-out read reaches it only when the database lets the
// anonymous caller in. Until then — or while the template family is not on this database at all —
// the read answers `closed` and the pages render an honest empty gallery; they never crash and never
// show a stitched-in second list.

import { SPACE_TEMPLATE_CATEGORIES } from "@/lib/spaces-blocks/template-pack";
import { searchTemplates, type TemplateSearchFace } from "@/lib/spaces-blocks/template-search";
import { signUpHref } from "@/utils/auth/auth-destination";

import { GALLERY_PAGE, isSpaceCard, wordFor, type GalleryAnswer, type GalleryCard } from "./catalogue";

export const PUBLIC_GALLERY_PATH = "/templates";

/** One template's page: its readable address, else the catalog id (which redirects to the address). */
export const publicTemplateHref = (card: Pick<GalleryCard, "slug" | "catalogue_id">) =>
  `${PUBLIC_GALLERY_PATH}/${encodeURIComponent(card.slug ?? card.catalogue_id)}`;

export const industryHref = (industry: string) => `${PUBLIC_GALLERY_PATH}/category/${encodeURIComponent(industry)}`;
export const jobHref = (job: string) => `${PUBLIC_GALLERY_PATH}/job/${encodeURIComponent(job)}`;

/**
 * WORKSPACES (Arman, 2026-10-18 "Yes, public gallery"): the Space templates — platform `custom.template` rows
 * whose card carries `space` — on the same catalog, listed at /templates/workspaces and per Space category.
 */
export const WORKSPACES_PATH = `${PUBLIC_GALLERY_PATH}/workspaces`;
export const workspacesHref = (category?: string | null) => (category ? `${WORKSPACES_PATH}/${encodeURIComponent(category)}` : WORKSPACES_PATH);

/** A Space category's label: the library's own word, else the key made readable (a category added later still shows). */
export function spaceCategoryLabel(key: string): string {
  return SPACE_TEMPLATE_CATEGORIES.find((c) => c.key === key)?.label ?? key.replace(/[_-]/g, " ").replace(/^\w/, (ch) => ch.toUpperCase());
}

/** The Space categories these cards hold, in the library's order (unknown keys last, by label). */
export function spaceCategories(cards: readonly Pick<GalleryCard, "space">[]): string[] {
  const seen = new Set<string>();
  for (const c of cards) if (c.space?.category) seen.add(c.space.category);
  const known = SPACE_TEMPLATE_CATEGORIES.map((c) => c.key as string).filter((k) => seen.has(k));
  const rest = [...seen].filter((k) => !known.includes(k)).sort((a, b) => spaceCategoryLabel(a).localeCompare(spaceCategoryLabel(b)));
  return [...known, ...rest];
}

/**
 * "Use this template" on a Space template: the in-app landing that installs its newest platform version into
 * the active organization and opens the new page (/spaces/use-template). A guest signs up first and lands there.
 */
export const spaceUseTemplateHref = (card: Pick<GalleryCard, "catalogue_id">) => `/spaces/use-template?template=${encodeURIComponent(card.catalogue_id)}`;
export const spaceTemplateSignUpHref = (card: Pick<GalleryCard, "catalogue_id">) => signUpHref(spaceUseTemplateHref(card));

/** The query a guest carries through sign-up so the page installs the template on return. */
export const INSTALL_ON_RETURN = "install";

/** "Use this template" for a guest: sign up, then come back to this page and install. */
export const templateSignUpHref = (card: Pick<GalleryCard, "slug" | "catalogue_id">) =>
  signUpHref(`${publicTemplateHref(card)}?${INSTALL_ON_RETURN}=1`);

/** What a signed-out read of the catalog answered. */
export type PublicRead =
  | { state: "open"; cards: GalleryCard[] }
  /** The door is not on this database, or refuses a caller with no session. */
  | { state: "closed"; reason: "absent" | "refused" };

interface DoorError {
  code?: string | null;
  message?: string | null;
}

/**
 * Absent (PostgREST cannot find the function / schema, Postgres has no such function) and refused
 * (no execute grant, or the door's own "Sign in" refusal) are the two states a signed-out visitor
 * meets before the family is public. Anything else is a real failure: null here, and the caller throws.
 */
export function closedReason(error: DoorError): "absent" | "refused" | null {
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "42883" || code === "PGRST106" || code === "3F000") return "absent";
  if (code === "42501") return "refused";
  return null;
}

/** The platform's published templates only: an organization's own saved templates are never public. */
export function publicCards(cards: readonly GalleryCard[]): GalleryCard[] {
  return cards.filter((c) => c.scope === "platform" && !c.owner_organization_id);
}

type Rpc = (offset: number) => PromiseLike<{ data: unknown; error: DoorError | null }>;

/** Reads every platform card, page by page, and classifies a closed door. */
export async function readPublicCatalogueWith(rpc: Rpc): Promise<PublicRead> {
  const cards: GalleryCard[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await rpc(offset);
    if (error) {
      const reason = closedReason(error);
      if (reason) return { state: "closed", reason };
      throw new Error(`The template catalog could not be read: ${error.message ?? error.code ?? "unknown error"}`);
    }
    const answer = data as GalleryAnswer;
    cards.push(...answer.cards);
    offset += GALLERY_PAGE;
    if (answer.cards.length < GALLERY_PAGE || offset >= answer.total) break;
  }
  return { state: "open", cards: publicCards(cards) };
}

export const platformFilter = (offset: number) => ({ scope: "platform", limit: GALLERY_PAGE, offset, thumb: true });

/** One sentence for a page's description: the template's persona, else its business. */
export function templateDescription(card: Pick<GalleryCard, "persona" | "business" | "name"> & Partial<Pick<GalleryCard, "space">>): string {
  const text = card.space?.description ?? card.persona ?? card.business ?? card.name;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

// ── One gallery: categories, featured, search (GALLERY-UX, ADVERSARIAL-2 #2 #6 #7) ─────────────────────────────

/**
 * ONE CATEGORY SYSTEM: the Space categories (incl. the industry ones) are the gallery's only rail. A table
 * template files under the category its industry belongs to, so a category page holds both kinds and /templates
 * no longer shows a second, industry rail beside it. `cross_industry` files under none (it shows under "All").
 */
export const INDUSTRY_CATEGORY: Readonly<Record<string, string | null>> = {
  healthcare: "healthcare",
  legal_professional: "legal",
  construction_trades: "trades",
  field_home_services: "trades",
  automotive: "trades",
  real_estate_property: "realestate",
  hospitality_food: "hospitality",
  agencies_creative: "agencies",
  retail_ecommerce: "retail",
  manufacturing_logistics: "manufacturing",
  agriculture_environment: "operations",
  education: "education",
  nonprofit_community: "nonprofit",
  software_it: "tech",
  fitness_beauty_wellness: "wellness",
  media_creators: "media",
  staffing_hr_recruiting: "team",
  personal_family: "personal",
  events_weddings: "planning",
  cross_industry: null,
};

/** The one category a card files under: a workspace's own, else its industry's. */
export function cardCategory(card: Pick<GalleryCard, "space" | "industry">): string | null {
  if (isSpaceCard(card)) return card.space?.category ?? null;
  return card.industry ? (INDUSTRY_CATEGORY[card.industry] ?? null) : null;
}

/** Every category the cards fill, in the library's order (unknown keys last, by label), with how many each holds. */
export function galleryCategories(cards: readonly GalleryCard[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const k = cardCategory(c);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const known = SPACE_TEMPLATE_CATEGORIES.map((c) => c.key as string).filter((k) => counts.has(k));
  const rest = [...counts.keys()].filter((k) => !known.includes(k)).sort((a, b) => spaceCategoryLabel(a).localeCompare(spaceCategoryLabel(b)));
  return [...known, ...rest].map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

/**
 * FEATURED (a knob: edit this list): eight strong workspaces across categories, chosen by hand for quality — never
 * the first six alphabetically (ADVERSARIAL-2 #13). Catalog ids, so a slug or title change keeps the pick.
 * A pick that is not published is skipped.
 */
export const FEATURED_SPACE_TEMPLATES: readonly string[] = [
  "SP0002", // Projects & Tasks
  "SP0150", // Sales CRM
  "SP0151", // Content Calendar
  "SP0101", // Team Wiki & Company Home
  "SP0003", // Meeting Notes
  "SP0300", // Freelancer OS
  "SP0103", // OKRs & Goals
  "SP0202", // Habit Tracker
];

export function featuredCards(cards: readonly GalleryCard[]): GalleryCard[] {
  const byId = new Map(cards.filter(isSpaceCard).map((c) => [c.catalogue_id, c]));
  return FEATURED_SPACE_TEMPLATES.flatMap((id) => byId.get(id) ?? []);
}

/** What the one template search reads of a table template's card (lib/spaces-blocks/template-search.ts). */
export function tableSearchFace(card: GalleryCard): TemplateSearchFace {
  return {
    title: card.name,
    description: card.persona,
    forWho: card.business,
    tags: [card.vertical, card.industry ? wordFor("industry", card.industry) : null, card.job ? wordFor("job", card.job) : null].filter(
      (t): t is string => Boolean(t),
    ),
  };
}

/** THE GALLERY SEARCH (?q=): the one template search over both kinds, best first; "" answers every card. */
export function searchGallery(cards: readonly GalleryCard[], query: string): GalleryCard[] {
  return searchTemplates(cards, query, (c) => (isSpaceCard(c) && c.space ? c.space : tableSearchFace(c)));
}

/** The address of a gallery page with a search: `?q=` only when there is one (linkable, crawlable). */
export const searchHref = (path: string, query: string) => (query.trim() ? `${path}?q=${encodeURIComponent(query.trim())}` : path);
