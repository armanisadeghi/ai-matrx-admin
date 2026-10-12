/**
 * Smart Add Brand — the evidence model (pure; no I/O).
 *
 * The cascade's findings arrive as EVIDENCE ITEMS from the
 * `smart_add_brand_identify` system workflow (aidream
 * `aidream/graph_actions/brand_identify.py`). The person answers each one
 * "This is us" / "Not us". Confirmed items seed the next round (a confirmed
 * website gets read, a confirmed account gets looked up); rejected items stop
 * their branch, and every decided key rides `exclude_keys` so a round only
 * brings what is new.
 *
 * Spec: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/SPEC.md
 */

export type EvidenceField =
  | "name"
  | "logo"
  | "website"
  | "social"
  | "description"
  | "category"
  | "phone"
  | "email"
  | "address";

export interface EvidenceSource {
  node: string;
  kind: "website" | "social_profile" | "link_in_bio" | "typed";
  url: string | null;
  where: string | null;
}

export interface EvidenceItem {
  key: string;
  field: EvidenceField;
  value: string;
  label: string | null;
  image_url: string | null;
  url: string | null;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  verified: boolean | null;
  /** The stored social profile (its avatar door), when the item came from a lookup. */
  profile_id: string | null;
  source: EvidenceSource;
  confidence: number;
}

export type Decision = "yes" | "no";

export interface SocialSeed {
  handle_or_url: string;
  platform?: string;
}

export interface RoundSeeds {
  website: string;
  socials: SocialSeed[];
}

/** One field answers once per brand (name, logo, website); the rest can hold several. */
export const SINGLE_VALUE_FIELDS: ReadonlySet<EvidenceField> = new Set(["name", "logo", "website", "description", "category"]);

/** Display order of the results area. */
export const FIELD_ORDER: EvidenceField[] = [
  "name",
  "logo",
  "website",
  "social",
  "description",
  "category",
  "phone",
  "email",
  "address",
];

export const FIELD_LABEL: Record<EvidenceField, string> = {
  name: "Name",
  logo: "Logo",
  website: "Website",
  social: "Account",
  description: "About",
  category: "Category",
  phone: "Phone",
  email: "Email",
  address: "Address",
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Read one evidence item from an untyped workflow payload; null when it is not one. */
export function parseEvidenceItem(raw: unknown): EvidenceItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const key = asString(r.key);
  const field = asString(r.field) as EvidenceField | null;
  const value = asString(r.value);
  if (!key || !field || !value || !FIELD_ORDER.includes(field)) return null;
  const src = (typeof r.source === "object" && r.source !== null ? r.source : {}) as Record<string, unknown>;
  return {
    key,
    field,
    value,
    label: asString(r.label),
    image_url: asString(r.image_url),
    url: asString(r.url),
    platform: asString(r.platform),
    handle: asString(r.handle),
    followers: typeof r.followers === "number" ? r.followers : null,
    verified: typeof r.verified === "boolean" ? r.verified : null,
    profile_id: asString(r.profile_id),
    source: {
      node: asString(src.node) ?? "",
      kind: (asString(src.kind) as EvidenceSource["kind"]) ?? "website",
      url: asString(src.url),
      where: asString(src.where),
    },
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
  };
}

/** Every evidence item inside a payload: `{brand_evidence: [...]}` (an emission) or `{evidence: [...]}` (a node output). */
export function evidenceFromPayload(payload: unknown): EvidenceItem[] {
  if (typeof payload !== "object" || payload === null) return [];
  const p = payload as Record<string, unknown>;
  const list = Array.isArray(p.brand_evidence) ? p.brand_evidence : Array.isArray(p.evidence) ? p.evidence : [];
  return list.map(parseEvidenceItem).filter((item): item is EvidenceItem => item !== null);
}

/** Add items to a keyed map; a repeated key keeps the higher confidence. Returns a new map only when something changed. */
export function mergeEvidence(current: Map<string, EvidenceItem>, incoming: EvidenceItem[]): Map<string, EvidenceItem> {
  let next: Map<string, EvidenceItem> | null = null;
  for (const item of incoming) {
    const existing = (next ?? current).get(item.key);
    if (existing && existing.confidence >= item.confidence) continue;
    next ??= new Map(current);
    next.set(item.key, item);
  }
  return next ?? current;
}

/** Items in display order: field order, then confidence, high first. */
export function orderedEvidence(items: Iterable<EvidenceItem>): EvidenceItem[] {
  return [...items].sort((a, b) => {
    const f = FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field);
    return f !== 0 ? f : b.confidence - a.confidence;
  });
}

/** Normalize a website address for comparison ("https://www.x.com/" → "x.com"). */
export function websiteHost(url: string): string {
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * The seeds the NEXT round should explore: confirmed websites and accounts not
 * explored yet. `explored` holds the seeds already sent (website hosts, account keys).
 */
export function nextRoundSeeds(
  items: Map<string, EvidenceItem>,
  decisions: Record<string, Decision>,
  explored: ReadonlySet<string>,
): RoundSeeds {
  let website = "";
  const socials: SocialSeed[] = [];
  for (const item of items.values()) {
    if (decisions[item.key] !== "yes") continue;
    if (item.field === "website" && !website) {
      const host = websiteHost(item.value);
      if (!explored.has(`website:${host}`)) website = item.url ?? item.value;
    } else if (item.field === "social" && item.source.kind !== "social_profile" && !explored.has(item.key)) {
      // An account found on a page is only a link: looking it up brings its own profile.
      socials.push({ handle_or_url: item.url ?? item.value, ...(item.platform ? { platform: item.platform } : {}) });
    }
  }
  return { website, socials };
}

/** The explored-set keys a round's seeds account for. */
export function seedKeys(seeds: RoundSeeds, accountKey: (seed: SocialSeed) => string | null): string[] {
  const keys: string[] = [];
  if (seeds.website) keys.push(`website:${websiteHost(seeds.website)}`);
  for (const s of seeds.socials) {
    const k = accountKey(s);
    if (k) keys.push(k);
  }
  return keys;
}

export interface BrandBasics {
  name: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  category: string | null;
  accounts: EvidenceItem[];
  facts: EvidenceItem[];
}

/** The confirmed basics a brand is created from (the highest-confidence confirmed value per single field). */
export function confirmedBasics(items: Map<string, EvidenceItem>, decisions: Record<string, Decision>): BrandBasics {
  const yes = orderedEvidence(items.values()).filter((i) => decisions[i.key] === "yes");
  const first = (field: EvidenceField) => yes.find((i) => i.field === field) ?? null;
  // An account confirmed both as a page link and as a looked-up profile is one account.
  const accounts = new Map<string, EvidenceItem>();
  for (const item of yes.filter((i) => i.field === "social")) {
    const existing = accounts.get(item.key);
    if (!existing || item.source.kind === "social_profile") accounts.set(item.key, item);
  }
  return {
    name: first("name")?.value ?? null,
    logoUrl: first("logo")?.image_url ?? first("logo")?.value ?? null,
    websiteUrl: first("website")?.value ?? null,
    description: first("description")?.value ?? null,
    category: first("category")?.value ?? null,
    accounts: [...accounts.values()],
    facts: yes.filter((i) => i.field === "phone" || i.field === "email" || i.field === "address"),
  };
}

/** True when a confirmed single-value field makes this item moot (another value already said "this is us"). */
export function isSettledByAnother(item: EvidenceItem, items: Map<string, EvidenceItem>, decisions: Record<string, Decision>): boolean {
  if (!SINGLE_VALUE_FIELDS.has(item.field) || decisions[item.key]) return false;
  for (const other of items.values()) {
    if (other.key !== item.key && other.field === item.field && decisions[other.key] === "yes") return true;
  }
  return false;
}
