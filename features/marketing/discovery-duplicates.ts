/**
 * Discovery Inbox: a pending finding that names something the brand already KEPT is not a question. One shared,
 * pure place decides it (React-free, tested) so the Inbox, and any later list, never re-ask:
 *
 *   competitor → a kept competitor (profile list or seo.competitor) with the same name or domain
 *   person     → a person already linked to the brand (same name, or same page)
 *   offering   → an offering already in the products tree (same name)
 *
 * Matching mirrors the server's promotion (`name_key`: lower-case, letters and digits only).
 */

import { isJsonRecord, type DiscoveredItem } from "@/features/marketing/types";

export type KeptKind = "competitor" | "person" | "offering";

export interface KeptName {
  name?: string | null;
  /** Domain or full address. */
  domain?: string | null;
}

export interface KeptOnBrand {
  competitors: readonly KeptName[];
  people: readonly KeptName[];
  offerings: readonly KeptName[];
}

export const NOTHING_KEPT: KeptOnBrand = { competitors: [], people: [], offerings: [] };

const PERSON_FIELDS = new Set(["person", "people", "key_person", "founder", "owner", "ceo", "staff", "team_member", "employee"]);
const OFFERING_FIELDS = new Set(["product", "service", "products", "services", "primary_products_services", "offering"]);

/** The server's `name_key`. */
export function nameKey(text: string | null | undefined): string {
  return (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** A host from an address or bare domain; null when the text is not one. */
export function hostKey(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** What kind of kept thing a finding would become, from the field the finder named it by. */
export function keptKindOf(item: Pick<DiscoveredItem, "category" | "guessed_kind">): KeptKind | null {
  const field = (item.guessed_kind ?? "").toLowerCase();
  if (field === "competitor" || field === "competitors") return "competitor";
  if (PERSON_FIELDS.has(field)) return "person";
  if (item.category === "offering" || OFFERING_FIELDS.has(field)) return "offering";
  return null;
}

function texts(item: Pick<DiscoveredItem, "url" | "value">): string[] {
  const out: string[] = [];
  if (item.url) out.push(item.url);
  if (isJsonRecord(item.value)) {
    for (const key of ["text", "value", "label", "name", "domain", "url"]) {
      const v = item.value[key];
      if (typeof v === "string" && v.trim()) out.push(v);
    }
  } else if (typeof item.value === "string" && item.value.trim()) out.push(item.value);
  return out;
}

/** The kept entry a pending finding duplicates (same name, or same domain), else null. */
export function keptDuplicateOf(
  item: Pick<DiscoveredItem, "category" | "guessed_kind" | "url" | "value">,
  kept: KeptOnBrand,
): { kind: KeptKind; match: KeptName } | null {
  const kind = keptKindOf(item);
  if (!kind) return null;
  const pool = kind === "competitor" ? kept.competitors : kind === "person" ? kept.people : kept.offerings;
  const names = new Set(texts(item).map(nameKey).filter(Boolean));
  const hosts = new Set(texts(item).map(hostKey).filter((h): h is string => Boolean(h)));
  for (const entry of pool) {
    const k = nameKey(entry.name);
    const hostOfEntry = hostKey(entry.domain);
    if ((k && names.has(k)) || (hostOfEntry && hosts.has(hostOfEntry)) || (hostOfEntry && names.has(nameKey(hostOfEntry)))) {
      return { kind, match: entry };
    }
  }
  return null;
}

/** Split a page of findings into the ones still to decide and the ones the brand already holds. */
export function foldKeptDuplicates<T extends Pick<DiscoveredItem, "category" | "guessed_kind" | "url" | "value">>(
  items: readonly T[],
  kept: KeptOnBrand,
): { open: T[]; folded: T[] } {
  const open: T[] = [];
  const folded: T[] = [];
  for (const item of items) (keptDuplicateOf(item, kept) ? folded : open).push(item);
  return { open, folded };
}
