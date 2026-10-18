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
import { guardedUpdate } from "@ai-matrx/data/db";
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

const RESEARCH_IMAGE_LIMIT = 600;

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
 * Every research-captured image visible to this organization, newest first,
 * with its source page and topic. Bounded (newest RESEARCH_IMAGE_LIMIT rows) —
 * the workspace filters client-side by topic / hostname / search. Images the
 * researcher explicitly marked irrelevant are excluded.
 */
export async function fetchResearchImages(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ResearchImageRow[]> {
  await requireAuthenticatedSupabaseSession(supabase);
  const query = supabase
    .schema("research")
    .from("rs_media")
    .select(
      "id, file_id, url, thumbnail_url, alt_text, caption, width, height, is_relevant, created_at, topic_id, source_id, rs_source(id, url, hostname, title), rs_topic(id, name)",
    )
    .eq("organization_id", organizationId)
    .eq("media_type", "image")
    .not("url", "is", null)
    .or("is_relevant.is.null,is_relevant.eq.true")
    .order("created_at", { ascending: false })
    .limit(RESEARCH_IMAGE_LIMIT);
  const response = signal ? await query.abortSignal(signal) : await query;
  if (response.error) throw response.error;
  const rows = (response.data ?? []) as unknown as ResearchMediaJoinedRow[];
  return rows.map((row) => ({
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
  }));
}

// ============================================================================
// Research images — brand organization (platform.associations)
//
// Three canonical edges, all written through the associations chokepoint:
//   research_topic → web_brand   the research is about / for the brand
//   research_media → web_brand   one image organized under the brand
//   research_media → category    role `brand_image`, dimension `brand-image`
//                                (system starters: Inspiration, Our brand —
//                                keep / replace, Avoid; people add their own)
// Pairs registered in platform.association_types 2026-10-17.
// ============================================================================

export const BRAND_IMAGE_CATEGORY_ROLE = "brand_image";

export interface ResearchImageOrganization {
  /** topic id → brand ids it is linked to. */
  topicBrands: Record<string, string[]>;
  /** image id → brand ids it is organized under. */
  imageBrands: Record<string, string[]>;
  /** image id → brand-image category ids. */
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
  for (const edge of edgesOrThrow(imageCategoryEdges).edges) {
    if (edge.role !== BRAND_IMAGE_CATEGORY_ROLE) continue;
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
      attrs: { orgId: input.organizationId, role: BRAND_IMAGE_CATEGORY_ROLE },
    }),
  );
}

/** Take one category off images (the brand edge stays). */
export async function untagResearchImages(input: {
  imageIds: string[];
  categoryId: string;
}): Promise<void> {
  edgesOrThrow(
    await associationsHelpers.unlinkEdges(
      input.imageIds.map((id) => ({
        source: { type: "research_media" as const, id },
        target: { type: "category" as const, id: input.categoryId },
        role: BRAND_IMAGE_CATEGORY_ROLE,
      })),
    ),
  );
}

/** Take images out of a brand (their brand-image categories stay). */
export async function unlinkResearchImagesFromBrand(input: {
  imageIds: string[];
  brandId: string;
}): Promise<void> {
  edgesOrThrow(
    await associationsHelpers.unlinkEdges(
      input.imageIds.map((id) => ({
        source: { type: "research_media" as const, id },
        target: { type: "web_brand" as const, id: input.brandId },
      })),
    ),
  );
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
