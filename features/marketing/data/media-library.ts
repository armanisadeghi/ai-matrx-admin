/**
 * media-library.ts — data layer for the site Media workspace beyond the
 * crawled inventory: research-captured images (inspiration/reuse), and the
 * site's media standards (persisted at `web.site.settings.media_standards`).
 *
 * Brand asset CRUD stays in `service.ts` (listBrandAssets / createBrandAsset /
 * updateBrandAsset / deleteBrandAsset) — this module never forks it.
 */

import type { Database, Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import {
  authenticatedWebDb,
  requireAuthenticatedSupabaseSession,
} from "@/utils/supabase/webDb";
import { isJsonRecord } from "@/features/marketing/types";
import type { MarketingSite } from "@/features/marketing/types";
import { SITE_COLUMNS } from "@/features/marketing/data/service";
import { recordUnavailable } from "@/lib/records/recordUnavailable";
import { guardedUpdate, readAllRows } from "@ai-matrx/data/db";
import {
  associationsHelpers,
  associationsService,
} from "@/features/scopes/service/associationsService";

// ============================================================================
// Research images — inspiration + reuse candidates for this brand's org
// ============================================================================

type ResearchMediaRow =
  Database["research"]["Tables"]["rs_media"]["Row"];

export interface ResearchImageRow {
  id: string;
  /**
   * `cld_files` identity when the row is an artifact WE store (the research
   * upload sink). NULL for an image discovered on a page. Render owned rows
   * from this id — `url` then holds only a durable pointer (the CDN URL for a
   * public file, else the bare file_id), never a followable link.
   */
  fileId: string | null;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  isRelevant: boolean | null;
  createdAt: string | null;
  topicId: string | null;
  topicName: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
  sourceHostname: string | null;
  sourceTitle: string | null;
}

export const RESEARCH_IMAGE_PAGE_SIZE = 600;

interface ResearchMediaJoinedRow extends ResearchMediaRow {
  // `file_id` landed in migration 0434, newer than the checked-in generated
  // `Database` types; declared here so this file compiles before they are
  // regenerated (the column is selected below and always present).
  file_id: string | null;
  rs_source: {
    id: string;
    url: string | null;
    hostname: string | null;
    title: string | null;
  } | null;
  rs_topic: { id: string; name: string | null } | null;
}

/**
 * One page of research-captured images for this organization, newest first,
 * with its source page and topic. Every filter (brand, category, topic, origin,
 * search) runs in the query, so `total` and paging cover every matching image,
 * not only the loaded page. Images the researcher marked irrelevant are excluded.
 */
export interface ResearchImagePage {
  rows: ResearchImageRow[];
  /** Exact count of matching images in the organization (all pages). */
  total: number;
  offset: number;
}

/**
 * Which research images a page shows by brand link: one brand (images whose topic, or the image
 * itself, is linked to it), none (linked to no brand in `brandIds`), or all. Applied in the query,
 * so counts and paging cover every image, not only the loaded page.
 */
export type ResearchBrandScope =
  | { kind: "all" }
  | { kind: "brand"; brandId: string }
  | { kind: "none"; brandIds: string[] };

/** Category filter over ONE brand's image tags (tags are brand-scoped). */
export type ResearchCategoryFilter =
  | { kind: "any" }
  /** No tag for this brand; `categoryIds` = every brand-image category. */
  | { kind: "none"; brandId: string; categoryIds: string[] }
  | { kind: "category"; brandId: string; categoryId: string };

export interface ResearchImageFilters {
  scope: ResearchBrandScope;
  category: ResearchCategoryFilter;
  topicId: string | null;
  /** own = image or source page on one of `siteHosts`; external = neither. */
  origin: "all" | "own" | "external";
  siteHosts: string[];
  search: string;
}

export const ALL_RESEARCH_IMAGES: ResearchImageFilters = {
  scope: { kind: "all" },
  category: { kind: "any" },
  topicId: null,
  origin: "all",
  siteHosts: [],
  search: "",
};

async function brandLinkedResearch(brandIds: string[]): Promise<{ topicIds: string[]; imageIds: string[] }> {
  if (brandIds.length === 0) return { topicIds: [], imageIds: [] };
  const { edges } = edgesOrThrow(await associationsService.listForTargets("web_brand", brandIds));
  const of = (type: string) => [...new Set(edges.filter((e) => e.sourceType === type).map((e) => e.sourceId))];
  return { topicIds: of("research_topic"), imageIds: of("research_media") };
}

/** Image ids carrying any of `categoryIds` as a tag for `brandId` (every image, not a page). */
async function brandTaggedImageIds(brandId: string, categoryIds: string[]): Promise<string[]> {
  if (categoryIds.length === 0) return [];
  const role = brandImageRole(brandId);
  const { edges } = edgesOrThrow(await associationsService.listForTargets("category", categoryIds));
  return [
    ...new Set(
      edges
        .filter((e) => e.sourceType === "research_media" && e.role === role)
        .map((e) => e.sourceId),
    ),
  ];
}

/** Bare hostnames, with and without `www.` — how an image or source page names a site. */
function hostVariants(hosts: string[]): string[] {
  const bare = [...new Set(hosts.map((h) => h.toLowerCase().replace(/^www\./, "")).filter(Boolean))];
  return bare.flatMap((h) => [h, `www.${h}`]);
}

/** Source pages (rs_source) in the organization served from one of `hosts`. */
async function sourceIdsOnHosts(organizationId: string, hosts: string[]): Promise<string[]> {
  if (hosts.length === 0) return [];
  const rows = await readAllRows<{ id: string }>(({ from, to }) =>
    supabase
      .schema("research")
      .from("rs_source")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .in("hostname", hosts)
      .order("id", { ascending: true })
      .range(from, to),
    { label: "research.rs_source on brand hosts" },
  );
  return rows.map((row) => row.id);
}

/**
 * Source pages whose hostname contains the search term. Capped: a term this
 * broad is matched by the image URL leg of the search anyway.
 */
const SEARCH_SOURCE_CAP = 200;
async function sourceIdsMatching(organizationId: string, term: string): Promise<string[]> {
  const { data, error } = await supabase
    .schema("research")
    .from("rs_source")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("hostname", `%${term}%`)
    .limit(SEARCH_SOURCE_CAP);
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

/** A search term safe inside a PostgREST `or=(…)` quoted value. */
function searchTerm(raw: string): string {
  return raw.trim().replace(/[\\"(),*%]/g, " ").replace(/\s+/g, " ").trim();
}

const EMPTY_PAGE = (offset: number): ResearchImagePage => ({ rows: [], total: 0, offset });

export async function fetchResearchImagesPage(
  organizationId: string,
  offset: number,
  signal?: AbortSignal,
  filters: ResearchImageFilters = ALL_RESEARCH_IMAGES,
): Promise<ResearchImagePage> {
  await requireAuthenticatedSupabaseSession(supabase);
  const { scope, category, topicId, origin } = filters;
  const term = searchTerm(filters.search);
  const hosts = hostVariants(filters.siteHosts);
  const [linked, tagged, ownSources, searchSources] = await Promise.all([
    scope.kind === "brand"
      ? brandLinkedResearch([scope.brandId])
      : scope.kind === "none"
        ? brandLinkedResearch(scope.brandIds)
        : null,
    category.kind === "category"
      ? brandTaggedImageIds(category.brandId, [category.categoryId])
      : category.kind === "none"
        ? brandTaggedImageIds(category.brandId, category.categoryIds)
        : null,
    origin !== "all" ? sourceIdsOnHosts(organizationId, hosts) : null,
    term ? sourceIdsMatching(organizationId, term) : null,
  ]);
  if (scope.kind === "brand" && linked && linked.topicIds.length === 0 && linked.imageIds.length === 0) {
    return EMPTY_PAGE(offset);
  }
  if (category.kind === "category" && tagged && tagged.length === 0) return EMPTY_PAGE(offset);
  if (origin === "own" && hosts.length === 0) return EMPTY_PAGE(offset);
  let query = supabase
    .schema("research")
    .from("rs_media")
    .select(
      "id, file_id, url, thumbnail_url, alt_text, caption, width, height, is_relevant, created_at, topic_id, source_id, rs_source(id, url, hostname, title), rs_topic(id, name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .eq("media_type", "image")
    .not("url", "is", null)
    .or("is_relevant.is.null,is_relevant.eq.true")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (scope.kind === "brand" && linked) {
    const either = [
      linked.topicIds.length ? `topic_id.in.(${linked.topicIds.join(",")})` : null,
      linked.imageIds.length ? `id.in.(${linked.imageIds.join(",")})` : null,
    ].filter(Boolean);
    query = query.or(either.join(","));
  } else if (scope.kind === "none" && linked) {
    // NULL topic_id is "no brand" too: a bare NOT IN would drop those rows.
    if (linked.topicIds.length) query = query.or(`topic_id.is.null,topic_id.not.in.(${linked.topicIds.join(",")})`);
    if (linked.imageIds.length) query = query.not("id", "in", `(${linked.imageIds.join(",")})`);
  }
  if (category.kind === "category" && tagged) {
    query = query.in("id", tagged);
  } else if (category.kind === "none" && tagged?.length) {
    query = query.not("id", "in", `(${tagged.join(",")})`);
  }
  if (topicId) query = query.eq("topic_id", topicId);
  if (origin !== "all") {
    // The image itself (its URL host) or the page it came from (rs_source.hostname) is on a brand site.
    const urlPatterns = hosts.flatMap((h) => [`*://${h}/*`, `*://${h}`]);
    if (origin === "own") {
      const either = [
        ...urlPatterns.map((p) => `url.ilike.${p}`),
        ownSources?.length ? `source_id.in.(${ownSources.join(",")})` : null,
      ].filter(Boolean);
      query = query.or(either.join(","));
    } else {
      for (const pattern of urlPatterns) query = query.not("url", "ilike", pattern);
      if (ownSources?.length) query = query.or(`source_id.is.null,source_id.not.in.(${ownSources.join(",")})`);
    }
  }
  if (term) {
    const either = [
      `url.ilike."*${term}*"`,
      `alt_text.ilike."*${term}*"`,
      `caption.ilike."*${term}*"`,
      searchSources?.length ? `source_id.in.(${searchSources.join(",")})` : null,
    ].filter(Boolean);
    query = query.or(either.join(","));
  }
  query = query.range(offset, offset + RESEARCH_IMAGE_PAGE_SIZE - 1);
  const response = signal ? await query.abortSignal(signal) : await query;
  if (response.error) throw response.error;
  const rows = (response.data ?? []) as unknown as ResearchMediaJoinedRow[];
  return {
    offset,
    total: response.count ?? rows.length,
    rows: rows.map((row) => ({
      id: row.id,
      fileId: row.file_id,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      alt: row.alt_text,
      caption: row.caption,
      width: row.width,
      height: row.height,
      isRelevant: row.is_relevant,
      createdAt: row.created_at,
      topicId: row.topic_id,
      topicName: row.rs_topic?.name ?? null,
      sourceId: row.source_id,
      sourceUrl: row.rs_source?.url ?? null,
      sourceHostname: row.rs_source?.hostname ?? null,
      sourceTitle: row.rs_source?.title ?? null,
    })),
  };
}

export interface ResearchTopicOption {
  id: string;
  name: string;
}

/** Topics in the organization that carry at least one image — the Topic filter's options. */
export async function fetchResearchImageTopics(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ResearchTopicOption[]> {
  await requireAuthenticatedSupabaseSession(supabase);
  const rows = await readAllRows<{ id: string; name: string | null }>(({ from, to }) => {
    const query = supabase
      .schema("research")
      .from("rs_topic")
      .select("id, name, rs_media!inner(id)", { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("rs_media.media_type", "image")
      .limit(1, { referencedTable: "rs_media" })
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    return signal ? query.abortSignal(signal) : query;
  }, { label: "research.rs_topic with images" });
  return rows.map((row) => ({ id: row.id, name: row.name ?? "Untitled topic" }));
}

/** First page only (newest RESEARCH_IMAGE_PAGE_SIZE) — callers that just need a sample. */
export async function fetchResearchImages(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ResearchImageRow[]> {
  return (await fetchResearchImagesPage(organizationId, 0, signal)).rows;
}

// ============================================================================
// Research images — brand organization (platform.associations)
//
// Three canonical edges, all written through the associations chokepoint:
//   research_topic → web_brand   the research is about / for the brand
//   research_media → web_brand   one image organized under the brand
//   research_media → category    role `brand_image:<brandId>`, dimension
//                                `brand-image` (Inspiration, Our brand — keep /
//                                replace, Avoid; people add their own)
// Pairs registered in platform.association_types 2026-10-17.
//
// Tags are BRAND-SCOPED (2026-10-19): the brand lives in the edge's role, not
// in metadata, because platform.associations is unique on (source, target,
// role) — "Avoid" for brand A and "Avoid" for brand B on one image are two
// edges, and untagging removes exactly one of them (`remove` matches by role).
// The image → brand edge exists BECAUSE of its tags: removing an image's last
// tag for a brand removes its brand link, and unlinking from a brand removes
// that brand's tags with it.
// ============================================================================

export const BRAND_IMAGE_CATEGORY_ROLE = "brand_image";

/** The role a brand-image category tag carries for one brand. */
export function brandImageRole(brandId: string): string {
  return `${BRAND_IMAGE_CATEGORY_ROLE}:${brandId}`;
}

export interface ResearchImageOrganization {
  /** topic id → brand ids it is linked to. */
  topicBrands: Record<string, string[]>;
  /** image id → brand ids it is organized under. */
  imageBrands: Record<string, string[]>;
  /** image id → brand-image category ids tagged FOR the brand asked about. */
  imageCategories: Record<string, string[]>;
}

function pushTo(map: Record<string, string[]>, key: string, value: string) {
  const list = map[key] ?? (map[key] = []);
  if (!list.includes(value)) list.push(value);
}

function edgesOrThrow<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } },
): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export async function fetchResearchImageOrganization(
  imageIds: string[],
  topicIds: string[],
  brandId: string,
): Promise<ResearchImageOrganization> {
  const out: ResearchImageOrganization = {
    topicBrands: {},
    imageBrands: {},
    imageCategories: {},
  };
  const [topicEdges, imageBrandEdges, imageCategoryEdges] = await Promise.all([
    topicIds.length
      ? associationsService.listForSources("research_topic", topicIds, "web_brand")
      : Promise.resolve({ ok: true as const, data: { edges: [] } }),
    imageIds.length
      ? associationsService.listForSources("research_media", imageIds, "web_brand")
      : Promise.resolve({ ok: true as const, data: { edges: [] } }),
    imageIds.length
      ? associationsService.listForSources("research_media", imageIds, "category")
      : Promise.resolve({ ok: true as const, data: { edges: [] } }),
  ]);
  for (const edge of edgesOrThrow(topicEdges).edges) {
    pushTo(out.topicBrands, edge.sourceId, edge.targetId);
  }
  for (const edge of edgesOrThrow(imageBrandEdges).edges) {
    pushTo(out.imageBrands, edge.sourceId, edge.targetId);
  }
  const role = brandImageRole(brandId);
  for (const edge of edgesOrThrow(imageCategoryEdges).edges) {
    if (edge.role !== role) continue;
    pushTo(out.imageCategories, edge.sourceId, edge.targetId);
  }
  return out;
}

/** Organize images under a brand with one category — one batched write per edge kind. */
export async function tagResearchImages(input: {
  imageIds: string[];
  brandId: string;
  categoryId: string;
  organizationId: string;
}): Promise<void> {
  const sources = input.imageIds.map((id) => ({
    type: "research_media" as const,
    id,
  }));
  edgesOrThrow(
    await associationsHelpers.linkManyToOne({
      sources,
      target: { type: "web_brand", id: input.brandId },
      attrs: { orgId: input.organizationId },
    }),
  );
  edgesOrThrow(
    await associationsHelpers.linkManyToOne({
      sources,
      target: { type: "category", id: input.categoryId },
      attrs: { orgId: input.organizationId, role: brandImageRole(input.brandId) },
    }),
  );
}

/** This brand's tag edges on the given images. */
async function brandTagEdges(imageIds: string[], brandId: string) {
  if (imageIds.length === 0) return [];
  const role = brandImageRole(brandId);
  const { edges } = edgesOrThrow(
    await associationsService.listForSources("research_media", imageIds, "category"),
  );
  return edges.filter((edge) => edge.role === role);
}

function brandLinkEdges(imageIds: string[], brandId: string) {
  return imageIds.map((id) => ({
    source: { type: "research_media" as const, id },
    target: { type: "web_brand" as const, id: brandId },
  }));
}

/**
 * Take one category off images for ONE brand (other brands' tags stay). An
 * image left with no tag for this brand leaves the brand too.
 */
export async function untagResearchImages(input: {
  imageIds: string[];
  categoryId: string;
  brandId: string;
}): Promise<void> {
  const role = brandImageRole(input.brandId);
  edgesOrThrow(
    await associationsHelpers.unlinkEdges(
      input.imageIds.map((id) => ({
        source: { type: "research_media" as const, id },
        target: { type: "category" as const, id: input.categoryId },
        role,
      })),
    ),
  );
  const stillTagged = new Set(
    (await brandTagEdges(input.imageIds, input.brandId))
      .filter((edge) => edge.targetId !== input.categoryId)
      .map((edge) => edge.sourceId),
  );
  const bare = input.imageIds.filter((id) => !stillTagged.has(id));
  if (bare.length) {
    edgesOrThrow(await associationsHelpers.unlinkEdges(brandLinkEdges(bare, input.brandId)));
  }
}

/** Take images out of a brand, with every tag they carry for it. */
export async function unlinkResearchImagesFromBrand(input: {
  imageIds: string[];
  brandId: string;
}): Promise<void> {
  const tags = await brandTagEdges(input.imageIds, input.brandId);
  if (tags.length) {
    edgesOrThrow(
      await associationsHelpers.unlinkEdges(
        tags.map((edge) => ({
          source: { type: "research_media" as const, id: edge.sourceId },
          target: { type: "category" as const, id: edge.targetId },
          role: edge.role ?? undefined,
        })),
      ),
    );
  }
  edgesOrThrow(await associationsHelpers.unlinkEdges(brandLinkEdges(input.imageIds, input.brandId)));
}

// ============================================================================
// Site media standards — persisted at web.site.settings.media_standards
// ============================================================================

/** One named image slot the site standardizes (hero, og image, thumbnail…). */
export interface MediaStandardSlot {
  id: string;
  /** Human name of the slot ("Hero", "OG / share card", "Blog header"…). */
  name: string;
  width: number | null;
  height: number | null;
  /** Preferred format, e.g. "webp", "avif", "jpg", "svg". */
  format: string | null;
  /** Max file weight in KB the site tolerates for this slot. */
  maxKb: number | null;
  notes: string;
}

export interface SiteMediaStandards {
  slots: MediaStandardSlot[];
  /** Free-form site-wide rules (naming, tone, subjects to avoid…). */
  notes: string;
}

export const EMPTY_MEDIA_STANDARDS: SiteMediaStandards = {
  slots: [],
  notes: "",
};

/** Sensible starter slots offered when a site has no standards yet. */
export const DEFAULT_STANDARD_SLOTS: Array<
  Omit<MediaStandardSlot, "id">
> = [
  { name: "Hero", width: 1600, height: 900, format: "webp", maxKb: 250, notes: "" },
  { name: "OG / share card", width: 1200, height: 630, format: "jpg", maxKb: 300, notes: "" },
  { name: "Blog header", width: 1200, height: 675, format: "webp", maxKb: 200, notes: "" },
  { name: "Content inline", width: 800, height: 600, format: "webp", maxKb: 150, notes: "" },
  { name: "Thumbnail", width: 400, height: 300, format: "webp", maxKb: 60, notes: "" },
];

function parseSlot(value: Json): MediaStandardSlot | null {
  if (!isJsonRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  const name = typeof value.name === "string" ? value.name : null;
  if (!id || !name) return null;
  return {
    id,
    name,
    width: typeof value.width === "number" ? value.width : null,
    height: typeof value.height === "number" ? value.height : null,
    format: typeof value.format === "string" ? value.format : null,
    maxKb: typeof value.maxKb === "number" ? value.maxKb : null,
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

/** Parse `site.settings.media_standards` defensively — never throws. */
export function parseSiteMediaStandards(settings: Json): SiteMediaStandards {
  if (!isJsonRecord(settings)) return EMPTY_MEDIA_STANDARDS;
  const raw = settings.media_standards;
  if (!isJsonRecord(raw)) return EMPTY_MEDIA_STANDARDS;
  const slots = Array.isArray(raw.slots)
    ? raw.slots
        .map(parseSlot)
        .filter((slot): slot is MediaStandardSlot => slot !== null)
    : [];
  return {
    slots,
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

/**
 * Save the site's media standards under `settings.media_standards` with a
 * read-merge-write on the settings blob (sibling settings keys survive) and
 * optimistic concurrency on the site row version.
 */
export async function saveSiteMediaStandards(input: {
  siteId: string;
  expectedVersion: number;
  standards: SiteMediaStandards;
}): Promise<MarketingSite> {
  const db = await authenticatedWebDb(supabase);
  const current = await db
    .from("site")
    .select("settings")
    .eq("id", input.siteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (current.error) throw current.error;
  // Zero rows here is a denial, a deletion, or a stale id — never a proven
  // absence. `recordUnavailable` says all three and screams into the inspector.
  if (!current.data)
    throw recordUnavailable({
      entity: "site",
      reason: "unknown",
      recordId: input.siteId,
      relation: "web.site",
    });
  const settings = isJsonRecord(current.data.settings)
    ? current.data.settings
    : {};
  const nextSettings = {
    ...settings,
    media_standards: {
      slots: input.standards.slots,
      notes: input.standards.notes,
    },
  };
  const result = await guardedUpdate<MarketingSite & { version: number }>({
    expectedVersion: input.expectedVersion,
    applyUpdate: ({ expectedVersion, nextVersion }) =>
      db
        .from("site")
        .update({ settings: nextSettings, version: nextVersion })
        .eq("id", input.siteId)
        .eq("version", expectedVersion)
        .is("deleted_at", null)
        .select(SITE_COLUMNS)
        .maybeSingle(),
    fetchCurrent: () =>
      db
        .from("site")
        .select(SITE_COLUMNS)
        .eq("id", input.siteId)
        .is("deleted_at", null)
        .maybeSingle(),
  });
  if (result.status !== "saved") {
    throw new Error(
      "This site changed in another session. Reload and try again.",
    );
  }
  return result.row;
}
