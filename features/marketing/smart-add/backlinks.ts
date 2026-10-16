/**
 * Smart Add — does a found page link to the brand? (aidream step `backlinks`, brand.identify.backlinks.)
 *
 * The server reads each "On the web" row's page once and matches its links against the brand's website and
 * accounts. Each answer arrives as a `brand_backlinks` frame the moment it lands and again in the step's output
 * (`checks`), so a resumed session reads it from the run. The client only ever gets this compact summary.
 */

import type { ReviewLinkCheck } from "@/features/search-review/types";
import { parseSiteKind, type EvidenceItem, type SiteKind } from "./evidence";

export interface Backlink {
  targetKind: "website" | "social";
  platform: string | null;
  matchedUrl: string;
  anchorText: string;
  /** The host or `@handle` it points at. */
  label: string;
}

export interface BacklinkCheck {
  key: string;
  url: string;
  status: "found" | "none" | "failed";
  backlinks: Backlink[];
  reason: string | null;
  checkedAt: string | null;
  /** What kind of place the page is, recognized server-side from the very html the link check read (schema.org markup included). */
  siteKind: SiteKind | null;
}

/** The step's id in the identify run. */
export const BACKLINKS_STEP = "backlinks";

/** The kind a page that links to the brand defaults to (web.brand_relation_kind, system vocabulary). */
export const BACKLINK_KIND = "backlink";

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function parseBacklink(raw: unknown): Backlink | null {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  const url = r ? str(r.matched_url) : null;
  if (!r || !url) return null;
  return {
    targetKind: r.target_kind === "social" ? "social" : "website",
    platform: str(r.platform),
    matchedUrl: url,
    anchorText: str(r.anchor_text) ?? "",
    label: str(r.label) ?? "",
  };
}

export function parseBacklinkCheck(raw: unknown): BacklinkCheck | null {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  const key = r ? str(r.key) : null;
  if (!r || !key || (r.status !== "found" && r.status !== "none" && r.status !== "failed")) return null;
  return {
    key,
    url: str(r.url) ?? "",
    status: r.status,
    backlinks: Array.isArray(r.backlinks) ? r.backlinks.map(parseBacklink).filter((b): b is Backlink => b !== null) : [],
    reason: str(r.reason),
    checkedAt: str(r.checked_at),
    siteKind: parseSiteKind(r.site_kind),
  };
}

/** Every check in the step's output (`checks`) and its frames (`brand_backlinks`), keyed by row; output wins. */
export function backlinkChecksFrom(output: unknown, payloads: unknown[]): Record<string, BacklinkCheck> {
  const out: Record<string, BacklinkCheck> = {};
  const add = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      const c = parseBacklinkCheck(raw);
      if (c) out[c.key] = c;
    }
  };
  for (const p of payloads) add((p as Record<string, unknown> | null)?.brand_backlinks);
  add((output as Record<string, unknown> | null)?.checks);
  return out;
}

/** What the review row shows: checking (shimmer), the links found, none, or could not check. */
export function reviewLinkCheck(check: BacklinkCheck | undefined, checking: boolean): ReviewLinkCheck | undefined {
  if (!check) return checking ? { state: "checking", targets: [] } : undefined;
  if (check.status === "failed") return { state: "failed", targets: [], reason: check.reason };
  if (check.status === "none") return { state: "none", targets: [] };
  return {
    state: "found",
    targets: check.backlinks.map((b) => ({
      kind: b.targetKind,
      platform: b.platform,
      label: b.label,
      url: b.matchedUrl,
      anchorText: b.anchorText,
    })),
  };
}

/** "Links to acme.com and @acme on Instagram" — the suggestion's reason (hover only). */
export function backlinkReason(check: BacklinkCheck): string {
  const names = [...new Set(check.backlinks.map((b) => (b.targetKind === "website" ? b.label : `${b.label} on ${b.platform ?? "social"}`)))];
  return `This page links to ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""}`;
}

/** The row's page kind: the backlinks step read the page itself (markup and all), so its answer wins over the search-result-only one. */
export function withPageKind(item: EvidenceItem, check: BacklinkCheck | undefined): EvidenceItem {
  return check?.siteKind ? { ...item, siteKind: check.siteKind } : item;
}
