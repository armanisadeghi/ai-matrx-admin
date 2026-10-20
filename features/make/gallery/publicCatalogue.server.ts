// features/make/gallery/publicCatalogue.server.ts — LANE MAKE-HOME (v6), wave 4b.
//
// The signed-out read of the catalog for /templates, its pages and the sitemap, through the public door
// `public.templates_public` (platform cards only, the same card shape as `custom.templates`; v7 TEMPLATES). It asks with the
// publishable key and no session (never a secret key, never a cookie), so the page shows exactly what
// a crawler may see. Shared by a page and its metadata in one request.

import "server-only";
import { cache } from "react";

import { getScriptSupabaseClient } from "@/utils/supabase/getScriptClient";

import { platformFilter, readPublicCatalogueWith, type PublicRead } from "./publicGallery";
import type { PublicTemplatePage } from "./templatePage";
import { createTemplatePageReader, isTransientDoorError, TEMPLATE_PAGE_RETRY_MS, type TemplatePageRead } from "./templatePageRead";

async function readOnce(): Promise<PublicRead> {
  const sb = getScriptSupabaseClient();
  return readPublicCatalogueWith((offset) => sb.schema("public").rpc("templates_public", { p_filter: platformFilter(offset) }));
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
  const read = readOnce();
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
