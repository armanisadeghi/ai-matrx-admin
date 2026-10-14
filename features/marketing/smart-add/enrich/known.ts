/**
 * Enrich an existing brand through Smart Add — "What we already know" (pure; no I/O).
 * Design: common-docs smart-add-brand/ENRICH.md (Arman's words: VISION.md Part 13).
 *
 * Every current fact on the brand becomes one KnownFact, grouped (basics, websites, accounts, people,
 * offerings, other facts). The ones the person keeps checked seed the run as KNOWN, CONFIRMED facts:
 * evidence items with the person's decision already given, exactly what a confirmed answer looks like to
 * every round (`confirmed`, `known`, `exclude_keys`). The run then skips re-asking them and looks for what
 * is new. Unchecked facts are neither sent nor changed.
 */

import type { BrandExclusionRow } from "@/features/marketing/data/brand-relations";
import { accountKey, resolveAccountInput } from "@/features/marketing/social/account-input";
import type { SocialPlatform } from "@/features/marketing/social/types";
import {
  isJsonRecord,
  parseBrandProfile,
  type BrandAsset,
  type BrandProperty,
  type BusinessFact,
  type MarketingBrand,
  type MarketingSite,
} from "@/features/marketing/types";
import { websiteHost, type Decision, type EvidenceField, type EvidenceItem } from "../evidence";

export type KnownGroup = "basics" | "websites" | "accounts" | "people" | "offerings" | "facts";

export const KNOWN_GROUPS: { key: KnownGroup; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "websites", label: "Websites" },
  { key: "accounts", label: "Social accounts" },
  { key: "people", label: "People" },
  { key: "offerings", label: "Offerings" },
  { key: "facts", label: "Other facts" },
];

/** Where a known fact lives on the brand (what a removal or replacement touches). */
export type KnownRef =
  | { type: "brand"; field: "name" | "logo" | "description" | "industry" | "alias" | "website_url" }
  | { type: "site"; id: string }
  | { type: "property"; id: string }
  | { type: "fact"; id: string }
  | { type: "relation"; id: string }
  | { type: "offering"; id: string };

export interface KnownFact {
  /** Stable id: the evidence key when the fact seeds an item, else `<group>:<row id>`. */
  id: string;
  group: KnownGroup;
  /** What it is: "Name", "Logo", "Instagram", "Phone". */
  label: string;
  /** The exact value as stored (raw handle, raw address). */
  value: string;
  imageUrl: string | null;
  url: string | null;
  platform: string | null;
  ref: KnownRef;
  /** The evidence item this fact seeds the run with; null = it rides `known` only (people, offerings, other facts). */
  item: EvidenceItem | null;
  /** The confirmed answer the seeded item carries. */
  decision: Decision | null;
}

export interface BrandPerson {
  id: string;
  label: string;
  url: string | null;
  relationKey: string;
}

export interface BrandOffering {
  id: string;
  name: string;
  kind: string;
}

/** Everything currently on the brand, read once when enrich starts (brandState.ts). */
export interface BrandSnapshot {
  brand: MarketingBrand;
  sites: MarketingSite[];
  properties: BrandProperty[];
  assets: BrandAsset[];
  facts: BusinessFact[];
  people: BrandPerson[];
  offerings: BrandOffering[];
  exclusions: BrandExclusionRow[];
  /** The server's evidence key for long text (description, address): sha1 of the normalized text, 12 hex. */
  textKeys: Record<string, string>;
}

/** The normalization the server's `_key` hashes for description and address (brand_identify._key). */
export function textKeySource(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

const LOGO_KINDS = new Set(["logo", "headshot"]);

function factText(fact: BusinessFact): string | null {
  if (!isJsonRecord(fact.value)) return typeof fact.value === "string" ? fact.value : null;
  const v = fact.value as Record<string, unknown>;
  const text = typeof v.text === "string" ? v.text : typeof v.url === "string" ? v.url : null;
  return text?.trim() || null;
}

function seed(
  field: EvidenceField,
  key: string,
  value: string,
  extra: Partial<Pick<EvidenceItem, "url" | "image_url" | "platform" | "handle" | "label">> = {},
): EvidenceItem {
  return {
    key,
    field,
    value,
    label: extra.label ?? null,
    image_url: extra.image_url ?? null,
    url: extra.url ?? null,
    platform: extra.platform ?? null,
    handle: extra.handle ?? null,
    followers: null,
    verified: null,
    profile_id: null,
    // Already on the brand: the person's own confirmed fact, never a finding.
    source: { node: "brand", kind: "typed", url: null, where: "on your brand" },
    confidence: 1,
  };
}

/** The account's evidence key, as the identify workflow writes it (`social:<platform>:<handle>`). */
export function propertyAccountKey(p: Pick<BrandProperty, "kind" | "url" | "handle">): string | null {
  const text = p.url ?? p.handle;
  if (!text) return null;
  const parsed = resolveAccountInput({ text, picked: (p.kind as SocialPlatform) ?? null });
  if (parsed.status === "ok") return `social:${accountKey(parsed)}`;
  return p.handle ? `social:${p.kind.toLowerCase()}:${p.handle.toLowerCase().replace(/^@/, "")}` : null;
}

/** The brand's current logo (brand.logo_url, else the primary logo/headshot asset with an address). */
export function currentLogo(s: Pick<BrandSnapshot, "brand" | "assets">): { url: string; assetId: string | null } | null {
  const primary = s.assets
    .filter((a) => LOGO_KINDS.has(a.kind) && a.source_url)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
  if (s.brand.logo_url) return { url: s.brand.logo_url, assetId: primary?.source_url === s.brand.logo_url ? primary.id : null };
  return primary?.source_url ? { url: primary.source_url, assetId: primary.id } : null;
}

/** Every current fact on the brand, grouped, each with its real value. */
export function knownFacts(s: BrandSnapshot): KnownFact[] {
  const out: KnownFact[] = [];
  const b = s.brand;
  const push = (f: Omit<KnownFact, "imageUrl" | "url" | "platform"> & Partial<Pick<KnownFact, "imageUrl" | "url" | "platform">>) =>
    out.push({ imageUrl: null, url: null, platform: null, ...f });

  if (b.name.trim()) {
    const v = b.name.trim();
    push({ id: `name:${v.toLowerCase()}`, group: "basics", label: "Name", value: v, ref: { type: "brand", field: "name" }, item: seed("name", `name:${v.toLowerCase()}`, v), decision: "preferred" });
  }
  const logo = currentLogo(s);
  if (logo) {
    const key = `logo:${logo.url.toLowerCase()}`;
    push({ id: key, group: "basics", label: b.kind === "person" ? "Photo" : "Logo", value: logo.url, imageUrl: logo.url, url: logo.url, ref: { type: "brand", field: "logo" }, item: seed("logo", key, logo.url, { image_url: logo.url, url: logo.url }), decision: "preferred" });
  }
  if (b.description?.trim()) {
    const v = b.description.trim();
    const key = `description:${s.textKeys[textKeySource(v)] ?? textKeySource(v)}`;
    push({ id: key, group: "basics", label: "Description", value: v, ref: { type: "brand", field: "description" }, item: seed("description", key, v), decision: "preferred" });
  }
  if (b.industry?.trim()) {
    const v = b.industry.trim();
    push({ id: `category:${v.toLowerCase()}`, group: "basics", label: "Industry", value: v, ref: { type: "brand", field: "industry" }, item: seed("category", `category:${v.toLowerCase()}`, v), decision: "preferred" });
  }
  for (const alias of parseBrandProfile(b.profile).brand_aliases ?? []) {
    const key = `name:${alias.toLowerCase()}`;
    if (out.some((f) => f.id === key)) continue;
    push({ id: key, group: "basics", label: "Other name", value: alias, ref: { type: "brand", field: "alias" }, item: seed("name", key, alias), decision: "alias" });
  }

  // Websites: every site, plus the brand's own website address when no site carries it. The primary one is preferred.
  const primaryHost = b.website_url ? websiteHost(b.website_url) : null;
  const seenHosts = new Set<string>();
  const sites = [...s.sites].sort((a, c) => Number(websiteHost(c.root_url ?? c.domain ?? "") === primaryHost) - Number(websiteHost(a.root_url ?? a.domain ?? "") === primaryHost));
  for (const site of sites) {
    const address = site.root_url ?? (site.domain ? `https://${site.domain}` : null);
    if (!address) continue;
    const host = websiteHost(address);
    if (seenHosts.has(host)) continue;
    seenHosts.add(host);
    const key = `website:${host}`;
    push({ id: key, group: "websites", label: host === primaryHost ? "Primary website" : "Website", value: address, url: address, ref: { type: "site", id: site.id }, item: seed("website", key, address, { url: address, label: host }), decision: host === primaryHost ? "preferred" : "yes" });
  }
  if (b.website_url && primaryHost && !seenHosts.has(primaryHost)) {
    const key = `website:${primaryHost}`;
    seenHosts.add(primaryHost);
    push({ id: key, group: "websites", label: "Primary website", value: b.website_url, url: b.website_url, ref: { type: "brand", field: "website_url" }, item: seed("website", key, b.website_url, { url: b.website_url, label: primaryHost }), decision: "preferred" });
  }
  for (const p of s.properties.filter((x) => x.kind === "website" && x.url)) {
    const host = websiteHost(p.url as string);
    if (seenHosts.has(host)) continue;
    seenHosts.add(host);
    const key = `website:${host}`;
    push({ id: key, group: "websites", label: "Website", value: p.url as string, url: p.url, ref: { type: "property", id: p.id }, item: seed("website", key, p.url as string, { url: p.url, label: host }), decision: "yes" });
  }

  // Social accounts, by platform (exact handle).
  const accounts = s.properties.filter((p) => p.kind !== "website").sort((a, c) => a.kind.localeCompare(c.kind));
  for (const p of accounts) {
    const key = propertyAccountKey(p) ?? `accounts:${p.id}`;
    if (out.some((f) => f.id === key)) continue;
    const handle = p.handle ?? (key.startsWith("social:") ? key.split(":").slice(2).join(":") : null);
    push({
      id: key,
      group: "accounts",
      label: p.kind,
      value: handle ? `@${handle.replace(/^@/, "")}` : (p.url ?? p.display_name ?? ""),
      url: p.url,
      platform: p.kind,
      ref: { type: "property", id: p.id },
      item: key.startsWith("social:") ? seed("social", key, p.url ?? handle ?? "", { url: p.url, platform: p.kind, handle, label: p.display_name }) : null,
      decision: key.startsWith("social:") ? "yes" : null,
    });
  }

  for (const person of s.people) {
    push({ id: `people:${person.id}`, group: "people", label: "Person", value: person.label, url: person.url, ref: { type: "relation", id: person.id }, item: null, decision: null });
  }
  for (const o of s.offerings) {
    push({ id: `offerings:${o.id}`, group: "offerings", label: o.kind || "Offering", value: o.name, ref: { type: "offering", id: o.id }, item: null, decision: null });
  }

  // Phone / email / address seed items (the run's own fields); every other fact rides `known` only.
  for (const f of s.facts) {
    const v = factText(f);
    if (!v) continue;
    const field: EvidenceField | null = f.kind === "phone" ? "phone" : f.kind === "email" ? "email" : f.kind === "address" ? "address" : null;
    const keyValue = field === "phone" ? v.replace(/\D/g, "").slice(-10) : field === "address" ? (s.textKeys[textKeySource(v)] ?? textKeySource(v)) : v.toLowerCase();
    const key = field ? `${field}:${keyValue}` : `facts:${f.id}`;
    if (out.some((x) => x.id === key)) continue;
    const label = f.label?.trim() || f.kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    push({ id: key, group: "facts", label, value: v, ref: { type: "fact", id: f.id }, item: field ? seed(field, key, v) : null, decision: field ? "yes" : null });
  }
  return out;
}

export interface EnrichSeed {
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  /** What rides the round's `known` input beside the seeded items (no evidence field of its own). */
  known: { people: string[]; offerings: string[]; facts: { label: string; value: string }[] };
  /** Evidence keys on the brand's NO LIST: never brought back. */
  excludeKeys: string[];
  /** NO LIST values with no evidence key (a url): the we-think step reads them as exclusions. */
  exclusions: string[];
}

/** The run's seed from the CHECKED known facts (unchecked ones are not sent). */
export function enrichSeed(known: KnownFact[], checked: ReadonlySet<string>, exclusions: BrandExclusionRow[]): EnrichSeed {
  const picked = known.filter((f) => checked.has(f.id));
  const items: EvidenceItem[] = [];
  const decisions: Record<string, Decision> = {};
  for (const f of picked) {
    if (!f.item || !f.decision) continue;
    items.push(f.item);
    decisions[f.item.key] = f.decision;
  }
  const excludeKeys: string[] = [];
  const excluded: string[] = [];
  for (const x of exclusions) {
    if (x.matchKind === "account") excludeKeys.push(x.matchValue.startsWith("account:") ? `social:${x.matchValue.slice(8)}` : x.matchValue);
    else if (x.matchKind === "host") excludeKeys.push(`website:${x.matchValue}`);
    else if (x.matchKind === "name") excludeKeys.push(`name:${x.matchValue}`);
    excluded.push(x.url ?? x.matchValue);
  }
  return {
    items,
    decisions,
    known: {
      people: picked.filter((f) => f.group === "people").map((f) => f.value),
      offerings: picked.filter((f) => f.group === "offerings").map((f) => f.value),
      facts: picked.filter((f) => f.group === "facts" && !f.item).map((f) => ({ label: f.label, value: f.value })),
    },
    excludeKeys: [...new Set(excludeKeys)],
    exclusions: [...new Set(excluded)],
  };
}
