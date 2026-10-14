/**
 * Smart Add · person: rank candidate accounts by what is already KNOWN about the person (2026-10-14).
 *
 * After a confirmed find (their own site, a licence page) or with typed facts (city, occupation, company), a card
 * that links to the found site or carries those facts goes first; a namesake whose stated location is another city
 * and who carries no other anchor drops to the end. Pure; the order is stable for equal scores.
 */
import type { EvidenceItem } from "./evidence";
import { websiteHost } from "./evidence";

export interface PersonAnchors {
  city?: string | null;
  occupation?: string | null;
  company?: string | null;
  /** Hosts of sites / pages the person confirmed (nancywrightcpa.com). */
  foundHosts?: string[];
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

function textOf(i: EvidenceItem): string {
  const a = i.anchor;
  return [i.label, i.value, i.url, i.handle, i.snippet, a?.display_name, a?.bio_line, a?.location, ...(a?.reasons ?? [])]
    .filter(Boolean)
    .join(" ");
}

/** Points for each anchor the candidate carries; negative when it states another city and carries nothing else. */
export function anchorScore(i: EvidenceItem, anchors: PersonAnchors): number {
  const blob = norm(textOf(i));
  const city = norm((anchors.city ?? "").split(",")[0]);
  let score = 0;
  const hosts = (anchors.foundHosts ?? []).map((h) => norm(websiteHost(h).split(".")[0])).filter((h) => h.length >= 4);
  if (hosts.some((h) => blob.includes(h))) score += 3;
  for (const fact of [anchors.occupation, anchors.company]) {
    const f = norm(fact);
    if (f.length >= 3 && blob.includes(f)) score += 2;
  }
  if (city.length >= 3 && blob.includes(city)) score += 2;
  const stated = norm(i.anchor?.location);
  if (score === 0 && city && stated && !stated.includes(city)) score -= 2;
  return score;
}

/** `items` re-ordered by anchors first (stable: ties keep their incoming order). */
export function rankByAnchors(items: EvidenceItem[], anchors: PersonAnchors): EvidenceItem[] {
  const any = Boolean(anchors.city || anchors.occupation || anchors.company || anchors.foundHosts?.length);
  if (!any) return items;
  return items
    .map((item, n) => ({ item, n, s: anchorScore(item, anchors) }))
    .sort((a, b) => b.s - a.s || a.n - b.n)
    .map((x) => x.item);
}
