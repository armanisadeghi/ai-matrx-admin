// features/make/gallery/publicCatalogue.server.ts — LANE MAKE-HOME (v6), wave 4b.
//
// The signed-out read of the catalog for /templates, its pages and the sitemap, through the public door
// `public.templates_public` (platform cards only, the same card shape as `custom.templates`; v7 TEMPLATES). It asks with the
// publishable key and no session (never a secret key, never a cookie), so the page shows exactly what
// a crawler may see. Shared by a page and its metadata in one request.

import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getScriptSupabaseClient } from "@/utils/supabase/getScriptClient";

import { platformFilter, readPublicCatalogueWith, type PublicRead } from "./publicGallery";
import type { PublicTemplatePage } from "./templatePage";
import { createTemplatePageReader, isTransientDoorError, TEMPLATE_PAGE_RETRY_MS, type TemplatePageRead } from "./templatePageRead";

// DB LANE A (2026-10-21): ONE catalog read per DEPLOYMENT, not per server process. Every Vercel lambda
// kept its own 30 s copy, so /templates, its category/job pages, the sitemap and OG images re-read the
// whole paged catalog (1.2k cards, ~670 kB and ~360 ms of database time per 200-card page) about once a
// minute: 2,869 calls / 1,029 s in the 5.7 h census. Each PAGE of the read now lives in Next's shared
// data cache (one entry per offset; the whole catalog is past the 2 MB entry limit) for
// SHARED_CATALOGUE_PAGE_S, tagged TEMPLATES_PUBLIC_TAG. A new template's own page is read directly
// (template_public_page) and a would-be 404 still asks the catalog itself (`readPublicCatalogueFresh`),
// so the shared copy only delays where a new card shows up in the gallery lists.
export const TEMPLATES_PUBLIC_TAG = "templates-public";
const SHARED_CATALOGUE_PAGE_S = 10 * 60;

/** Thrown inside the cached read so a failed page is never kept; unwrapped back into the rpc answer below. */
class UncachedDoorAnswer extends Error {
  constructor(readonly answer: { data: unknown; error: { code?: string | null; message?: string | null; name?: string | null } }) {
    super(answer.error.message ?? "templates_public did not answer");
  }
}

const cataloguePage = unstable_cache(
  async (offset: number): Promise<unknown> => {
    const answer = await getScriptSupabaseClient().schema("public").rpc("templates_public", { p_filter: platformFilter(offset) });
    if (answer.error) throw new UncachedDoorAnswer(answer);
    return answer.data;
  },
  ["templates_public_page"],
  { revalidate: SHARED_CATALOGUE_PAGE_S, tags: [TEMPLATES_PUBLIC_TAG] },
);

async function readOnce(fresh = false): Promise<PublicRead> {
  const sb = getScriptSupabaseClient();
  if (fresh) return readPublicCatalogueWith((offset) => sb.schema("public").rpc("templates_public", { p_filter: platformFilter(offset) }));
  return readPublicCatalogueWith(async (offset) => {
    try {
      return { data: await cataloguePage(offset), error: null };
    } catch (failure) {
      if (failure instanceof UncachedDoorAnswer) return failure.answer;
      // Outside a Next server (a script, a unit test) there is no shared data cache: read directly.
      if (failure instanceof Error && failure.message.includes("incrementalCache missing")) {
        return sb.schema("public").rpc("templates_public", { p_filter: platformFilter(offset) });
      }
      throw failure;
    }
  });
}

// ONE catalog read per server process for a few minutes, not one per page. React `cache()` lasts a
// single request, and the build prerenders every /templates/category/* and /templates/job/* page, so
// each page re-read the whole paged catalog: 192 RPC calls, ~4 minutes of waiting per build
// (measured 2026-10-08). FRESHNESS (GALLERY-UX, ADVERSARIAL-2 #11): a published or changed template shows within
// a minute — the shared read lives 30 s and the pages revalidate every 60 s (it was 5 min + hourly, and the
// gallery and sitemap trailed the catalog; a category page 404'd while its templates were live).
// A closed, timed-out or failed read is never kept.
const SHARED_READ_MS = 30 * 1000;
let sharedRead: { at: number; read: Promise<PublicRead> } | null = null;

function readShared(fresh = false): Promise<PublicRead> {
  if (!fresh && sharedRead && Date.now() - sharedRead.at < SHARED_READ_MS) return sharedRead.read;
  const read = readOnce(fresh);
  const entry = { at: Date.now(), read };
  sharedRead = entry;
  read.then(
    (r) => {
      if (r.state !== "open" && sharedRead === entry) sharedRead = null;
    },
    () => {
      if (sharedRead === entry) sharedRead = null;
    },
  );
  return read;
}

/** The catalog read past the shared copy: before a page answers 404, it asks the catalog itself once. */
export const readPublicCatalogueFresh = cache((): Promise<PublicRead> => readShared(true));

// ADVERSARIAL-5 F3: the last OPEN catalog read this process made. A failed read (PGRST002 while PostgREST restarts) is
// asked once more, then answered with it — the gallery and every template page's "related" row never 500 for a blip.
let lastGoodCatalogue: PublicRead | null = null;

async function readSharedOrLastGood(): Promise<PublicRead> {
  try {
    return await readShared();
  } catch (first) {
    if (!isTransientDoorError({ message: first instanceof Error ? first.message : String(first) }) && !lastGoodCatalogue) throw first;
    await new Promise((r) => setTimeout(r, TEMPLATE_PAGE_RETRY_MS));
    try {
      return await readShared(true);
    } catch (second) {
      if (!lastGoodCatalogue) throw second;
      console.warn(`[templates] the catalog read failed twice (${second instanceof Error ? second.message : String(second)}); showing the last good read.`);
      return lastGoodCatalogue;
    }
  }
}

export const readPublicCatalogue = cache(async (): Promise<PublicRead> => {
  const read = await readSharedOrLastGood();
  if (read.state === "open") lastGoodCatalogue = read;
  if (read.state === "closed") {
    console.warn(
      `[templates] the public gallery is empty because public.templates_public is ${read.reason === "absent" ? "not on this database" : "refused to a signed-out caller"}. ` +
        "Remedy: apply migrations/campaign/templates7_a_anyone_can_browse_the_platform_templates.sql.",
    );
  }
  return read;
});

export type { PublicTemplatePage } from "./templatePage";

// One reader per server process: it keeps each template's last good read (ADVERSARIAL-5 F3, templatePageRead.ts).
const readPageOnce = createTemplatePageReader((key) => getScriptSupabaseClient().schema("public").rpc("template_public_page", { p_key: key }));

/**
 * THE PAGE READ (`public.template_public_page`): one published platform template by its readable
 * address, its catalog id or a version id — so an old address finds the template and the page
 * sends it on to the readable one. A transient database error is asked again, then answered with the last
 * good read; "unavailable" only when neither answers (the page says so in place, never a 500).
 */
export const readTemplatePageState = cache((key: string): Promise<TemplatePageRead> => readPageOnce(key));

/** The page read as the page or null (missing, or unavailable right now): for metadata and the social image. */
export const readTemplatePage = cache(async (key: string): Promise<PublicTemplatePage | null> => {
  const read = await readTemplatePageState(key);
  return read.state === "open" ? read.page : null;
});
