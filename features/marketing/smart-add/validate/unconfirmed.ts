/**
 * Smart Add validation — the brand's OWN accounts and websites no person has confirmed yet (pure; no I/O).
 *
 * A brand can hold `web.property` / `web.site` rows nobody ever said are theirs: 70 of 71 brands made through Smart
 * Add before 2026-10-22 (Create wrote the homes with no answer), a seat's Create, an import. The validation page drops
 * every finding the brand already knows (fold.ts), so without these cards there was NO place to confirm them and
 * research condition 1 ("we know which brand is theirs") could never pass. Each one becomes an ordinary card
 * (Yes = ours / Not us), answered through the ONE writer (`persist.ts` `persistAnswer`) with the existing home as its
 * `created` target, `existing: true`: a Yes writes the same person-evidence row Create writes; Not us withdraws the
 * home through `web.decision_retraction` (restored on Undo).
 *
 * "Confirmed" mirrors the server's rule (aidream `research/verified_identity.py` `person_validated_properties`): an
 * account is named by a person-confirmed finding (`resolved_property_id`, relation in OWN_ACCOUNT_RELATIONS); a website
 * host is a site a person-confirmed `link` / `identity` finding names (`context.answer.homes`, `site_id`, or a website
 * link's URL). The server also drops a test seat's review (`web.brand_non_person_seat_ids`, not client-callable): a
 * card is not offered for a home a seat confirmed.
 */

import type { Json } from "@/types/database.types";
import { isJsonRecord } from "@/features/marketing/types";
import { websiteHost, type EvidenceItem } from "../evidence";
import { propertyAccountKey, seed } from "../enrich/known";

/** aidream research/verified_identity.py OWN_ACCOUNT_RELATIONS. */
export const OWN_ACCOUNT_RELATIONS: ReadonlySet<string> = new Set(["ours", "ours_but_wrong", "link_in_bio_page", "our_store_listing"]);
const SITE_CONFIRMING: ReadonlySet<string> = new Set(["link", "identity"]);

export interface PropertyRow {
  id: string;
  kind: string;
  url: string | null;
  handle: string | null;
  display_name?: string | null;
  status?: string | null;
}

export interface SiteRow {
  id: string;
  root_url: string | null;
  domain: string | null;
}

/** A person-confirmed finding (status confirmed, reviewed_by set) on the brand. */
export interface ConfirmedRow {
  category: string;
  guessed_kind: string | null;
  url: string | null;
  site_id: string | null;
  relation_key: string | null;
  resolved_property_id: string | null;
  context: Json;
}

/** One existing home to confirm: its card's evidence item and the rows a Yes names / a Not us withdraws. */
export interface UnconfirmedHome {
  item: EvidenceItem;
  propertyId?: string;
  siteId?: string;
}

const hostOf = (u: string | null | undefined) => (u ? websiteHost(u) : "");

/** A card for a home already on the brand. Not `typed` (buildQueue never asks a typed value): this one IS a question. */
function homeCard(...args: Parameters<typeof seed>): EvidenceItem {
  return { ...seed(...args), source: { node: "brand", kind: "website", url: null, where: "On your brand" } };
}

/** The website hosts a person confirmed (server: person_confirmed_site_hosts). */
export function personConfirmedHosts(confirmed: ConfirmedRow[], sites: SiteRow[]): Set<string> {
  const domains = new Map(sites.map((s) => [s.id, s.domain || hostOf(s.root_url)]));
  const hosts = new Set<string>();
  for (const c of confirmed) {
    if (!SITE_CONFIRMING.has(c.category)) continue;
    if (c.category === "identity" && c.site_id && domains.has(c.site_id)) hosts.add(hostOf(domains.get(c.site_id)));
    const raw = isJsonRecord(c.context) ? c.context.answer : undefined;
    const answer = raw !== undefined && isJsonRecord(raw) ? raw : null;
    const homes = answer && Array.isArray(answer.homes) ? answer.homes : [];
    for (const h of homes) if (typeof h === "string" && h.startsWith("web.site:") && domains.has(h.slice(9))) hosts.add(hostOf(domains.get(h.slice(9))));
    if (c.category === "link" && c.guessed_kind === "website" && c.url) hosts.add(hostOf(c.url));
  }
  hosts.delete("");
  return hosts;
}

/** The brand's active accounts and websites no person confirmed, one card each (a website = its host: site + property). */
export function unconfirmedHomes(input: { properties: PropertyRow[]; sites: SiteRow[]; confirmed: ConfirmedRow[] }): UnconfirmedHome[] {
  const active = input.properties.filter((p) => (p.status ?? "active") === "active");
  const named = new Set(
    input.confirmed.filter((c) => c.resolved_property_id && c.relation_key && OWN_ACCOUNT_RELATIONS.has(c.relation_key)).map((c) => c.resolved_property_id as string),
  );
  const hosts = personConfirmedHosts(input.confirmed, input.sites);
  // A website property a person's answer names validates its host too.
  for (const p of active) if (p.kind === "website" && named.has(p.id)) hosts.add(hostOf(p.url));
  const out: UnconfirmedHome[] = [];
  const seen = new Set<string>();

  // Websites, by host: the site and the website property of one host are one card.
  const byHost = new Map<string, { url: string; propertyId?: string; siteId?: string }>();
  for (const s of input.sites) {
    const host = s.domain ? hostOf(s.domain) : hostOf(s.root_url);
    if (!host || hosts.has(host)) continue;
    const cur = byHost.get(host) ?? { url: s.root_url ?? `https://${host}` };
    byHost.set(host, { ...cur, url: s.root_url ?? cur.url, siteId: cur.siteId ?? s.id });
  }
  for (const p of active.filter((x) => x.kind === "website" && x.url)) {
    const host = hostOf(p.url);
    if (!host || hosts.has(host)) continue;
    const cur = byHost.get(host) ?? { url: p.url as string };
    byHost.set(host, { ...cur, propertyId: cur.propertyId ?? p.id });
  }
  for (const [host, w] of byHost) {
    const key = `website:${host}`;
    seen.add(key);
    out.push({ item: homeCard("website", key, w.url, { url: w.url, label: host }), ...(w.propertyId ? { propertyId: w.propertyId } : {}), ...(w.siteId ? { siteId: w.siteId } : {}) });
  }

  // Accounts: the key the identify workflow writes (`social:<platform>:<handle>`), so an earlier answer's row is reused.
  for (const p of active.filter((x) => x.kind !== "website")) {
    if (named.has(p.id)) continue;
    const key = propertyAccountKey(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const handle = p.handle ?? key.split(":").slice(2).join(":");
    out.push({ item: homeCard("social", key, p.url ?? handle, { url: p.url, platform: p.kind, handle, label: p.display_name ?? null }), propertyId: p.id });
  }
  return out;
}
