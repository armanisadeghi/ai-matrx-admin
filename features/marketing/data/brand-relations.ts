/**
 * A brand's relationships, as the brand page shows and edits them — every home is canonical:
 *
 *   another name        → web.brand.profile.brand_aliases
 *   competitor          → web.brand.profile.competitors ({name, domain})
 *   not us              → web.brand_exclusion (the brand's NO LIST)
 *   every other kind    → web.discovered_item, status confirmed, `relation_key` from web.brand_relation_kind
 *
 * Smart Add writes the same homes (features/marketing/smart-add/relations.ts); this module is the
 * brand page's read + manual add/remove over them. Plan: common-docs smart-add-brand/BRAND-PAGES-PLAN.md.
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { isJsonRecord } from "@/features/marketing/types";

export interface BrandRelationRow {
  id: string;
  url: string | null;
  label: string;
  handle: string | null;
  relationKey: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  confidence: number | null;
  /** Grounding (hover only): where it was found and why it was suggested. */
  where: string | null;
  reason: string | null;
  answeredBy: string | null;
  source: string;
}

export interface BrandExclusionRow {
  id: string;
  matchKind: string;
  matchValue: string;
  url: string | null;
  label: string | null;
  source: string | null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Every confirmed relationship except the brand's own accounts and sites (those have their own sections). */
export async function listBrandRelations(brandId: string): Promise<BrandRelationRow[]> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db
    .from("discovered_item")
    .select("id, url, value, context, relation_key, sentiment, confidence, source")
    .eq("brand_id", brandId)
    .eq("status", "confirmed")
    .not("relation_key", "is", null)
    .not("relation_key", "in", "(ours,not_us,irrelevant)")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const value = rec(row.value);
    const context = rec(row.context);
    const answer = rec(context.answer);
    const suggested = rec(answer.suggested);
    const url = str(row.url) ?? str(value.text);
    return {
      id: row.id,
      url: url && /^https?:\/\//i.test(url) ? url : null,
      label: str(value.label) ?? str(value.handle) ?? url ?? "Untitled",
      handle: str(value.handle),
      relationKey: row.relation_key as string,
      sentiment: (row.sentiment as BrandRelationRow["sentiment"]) ?? null,
      confidence: row.confidence == null ? null : Number(row.confidence),
      where: str(context.where),
      reason: str(suggested.reason),
      answeredBy: str(answer.by),
      source: row.source,
    };
  });
}

export async function listBrandExclusions(brandId: string): Promise<BrandExclusionRow[]> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db
    .from("brand_exclusion")
    .select("id, match_kind, match_value, url, label, source")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    matchKind: r.match_kind,
    matchValue: r.match_value,
    url: r.url,
    label: r.label,
    source: r.source,
  }));
}

function hostOf(url: string): string | null {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Looks like an address (has a dot and no spaces) rather than a name. */
export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  return /^https?:\/\//i.test(t) || (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(t) && !t.includes(" "));
}

export function absoluteUrl(text: string): string {
  const t = text.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "linkedin.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "threads.net", "pinterest.com"];

function guessedKind(relationKey: string, url: string | null): string {
  if (relationKey === "mention") return "mention";
  if (relationKey === "founder" || relationKey === "key_person") return "person";
  if (["review_site", "claimable_listing", "our_store_listing"].includes(relationKey)) return "listing";
  return url ? "web_page" : "name";
}

/** A person adds a relationship by hand: kept as a confirmed finding with its relationship. */
export async function addBrandRelation(input: {
  organizationId: string;
  brandId: string;
  text: string;
  relationKey: string;
  sentiment?: "positive" | "neutral" | "negative" | null;
}): Promise<void> {
  const text = input.text.trim();
  const url = looksLikeUrl(text) ? absoluteUrl(text) : null;
  const host = url ? hostOf(url) : null;
  const category = url ? (host && SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? "social" : "link") : "other";
  const now = new Date().toISOString();
  const db = await authenticatedWebDb(supabase);
  const { error } = await db.from("discovered_item").insert({
    organization_id: input.organizationId,
    brand_id: input.brandId,
    source: "manual",
    category,
    guessed_kind: guessedKind(input.relationKey, url),
    url,
    value: { text, label: url ? host ?? text : text } as Json,
    context: { where: "Added on the brand page", answer: { by: "person", from: "brand_page", at: now } } as Json,
    confidence: 1,
    status: "confirmed",
    relation_key: input.relationKey,
    sentiment: input.sentiment ?? null,
    reviewed_at: now,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Already on this brand.");
    throw new Error(error.message);
  }
}

/** Removing a relationship keeps the record (soft delete) so nothing is lost for good. */
export async function removeBrandRelation(id: string): Promise<void> {
  const db = await authenticatedWebDb(supabase);
  const { error } = await db.from("discovered_item").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addBrandExclusion(input: { organizationId: string; brandId: string; text: string }): Promise<void> {
  const text = input.text.trim();
  const url = looksLikeUrl(text) ? absoluteUrl(text) : null;
  let match: { kind: "host" | "url" | "name"; value: string };
  if (url) {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    match = parsed.pathname.replace(/\/+$/, "") ? { kind: "url", value: `${host}${parsed.pathname}`.toLowerCase() } : { kind: "host", value: host };
  } else {
    match = { kind: "name", value: text.toLowerCase() };
  }
  const db = await authenticatedWebDb(supabase);
  const { error } = await db.from("brand_exclusion").insert({
    organization_id: input.organizationId,
    brand_id: input.brandId,
    match_kind: match.kind,
    match_value: match.value,
    url,
    label: text,
    relation_key: "not_us",
    source: "manual",
    context: { from: "brand_page" } as Json,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function removeBrandExclusion(id: string): Promise<void> {
  const db = await authenticatedWebDb(supabase);
  const { error } = await db.from("brand_exclusion").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** The raw profile keys this card edits, read without dropping anything else on the profile. */
export function profileAliases(profile: Json | null | undefined): string[] {
  const raw = isJsonRecord(profile) ? profile.brand_aliases : null;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && Boolean(x.trim())) : [];
}

export interface ProfileCompetitor {
  name: string;
  domain?: string;
  handles?: string[];
}

export function profileCompetitors(profile: Json | null | undefined): ProfileCompetitor[] {
  const raw = isJsonRecord(profile) ? profile.competitors : null;
  if (!Array.isArray(raw)) return [];
  const out: ProfileCompetitor[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim()) out.push({ name: entry.trim() });
    else if (isJsonRecord(entry) && typeof entry.name === "string") {
      out.push({
        name: entry.name,
        ...(typeof entry.domain === "string" ? { domain: entry.domain } : {}),
        ...(Array.isArray(entry.handles) ? { handles: entry.handles.filter((h): h is string => typeof h === "string") } : {}),
      });
    }
  }
  return out;
}

export function competitorFromText(text: string): ProfileCompetitor {
  const t = text.trim();
  if (!looksLikeUrl(t)) return { name: t };
  const host = hostOf(t) ?? t;
  return { name: host, domain: host };
}
