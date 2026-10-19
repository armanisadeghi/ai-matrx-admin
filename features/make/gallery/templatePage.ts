// features/make/gallery/templatePage.ts — ONE TEMPLATE'S PAGE READ, shaped (GALLERY-PERF, 2026-10-19).
//
// `public.template_public_page` answers { card, spec, updated_at }; a Space template's page pack rides in
// `spec.spacePack`. Two readers shape that answer the same way: the server page (publicCatalogue.server.ts
// readTemplatePage) and the browser, which reads the template again only when a visitor reaches the live preview
// (loadPublicPackTemplate) — so the spec and pack never ride the page's HTML as client props.

import { resolveRelativeDates, type TemplateSpec } from "@ai-matrx/records/templates";
import type { SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import type { GalleryCard } from "./catalogue";
import type { ShowSpec } from "./TemplateShowcase";

/** One template's public page: its card and its spec with every relative date resolved to today. */
export interface PublicTemplatePage {
  card: GalleryCard;
  spec: ShowSpec;
  /** A Space template's page pack (`spec.spacePack`): its page tree, drawn over the spec's sample rows. Null for a table template. */
  pack: Omit<SpaceTemplatePack, "spec"> | null;
  updatedAt: string | null;
}

/** The door's answer → the page (null when no published platform template answers to the key). */
export function shapeTemplatePage(data: unknown, today = new Date().toISOString().slice(0, 10)): PublicTemplatePage | null {
  const answer = data as { card: GalleryCard; spec: TemplateSpec; updated_at: string | null } | null;
  if (!answer?.card) return null;
  const { spacePack, ...tables } = answer.spec as TemplateSpec & { spacePack?: Omit<SpaceTemplatePack, "spec"> };
  const spec = resolveRelativeDates(tables as TemplateSpec, today) as unknown as ShowSpec;
  // A page-less pack that makes a board (the design-system starters) is a Space template too (ADVERSARIAL-3 D3).
  const pack = spacePack?.pages?.length || spacePack?.board ? spacePack : null;
  return { card: answer.card, spec, pack, updatedAt: answer.updated_at };
}

/** A Space template, as its live preview needs it: the spec's tables and sample rows, and its page pack. */
export interface PublicPackTemplate {
  id: string;
  catalogue_id: string;
  version: number;
  spec: TemplateSpec;
  pack: Omit<SpaceTemplatePack, "spec">;
}

/**
 * THE LIVE PREVIEW'S READ (browser): the same public door, straight to the database (no server hop), asked only once
 * the visitor reaches the preview. Throws when the template is gone or the read fails; the caller keeps the outline.
 */
export async function loadPublicPackTemplate(key: string): Promise<PublicPackTemplate> {
  const { createClient } = await import("@/utils/supabase/client");
  const { data, error } = await createClient().schema("public").rpc("template_public_page", { p_key: key });
  if (error) throw new Error(`The template preview could not be read: ${error.message ?? error.code ?? "unknown error"}`);
  const page = shapeTemplatePage(data);
  if (!page?.pack) throw new Error(`The template "${key}" has no pages to preview.`);
  return { id: page.card.id, catalogue_id: page.card.catalogue_id, version: page.card.version, spec: page.spec as unknown as TemplateSpec, pack: page.pack };
}
