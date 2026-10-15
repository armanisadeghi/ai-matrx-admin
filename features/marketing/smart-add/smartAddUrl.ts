/**
 * Smart Add addresses — THE one parser and builder for every Smart Add URL (FEATURE.md › URLs).
 * Every link that sends people to Smart Add is built here; the page reads its state through `parse`.
 *
 *   /marketing/brands/smart-add                 → redirects to /company (query kept)
 *   /marketing/brands/smart-add/company         → a business (the default)
 *   /marketing/brands/smart-add/person          → a person
 *   /marketing/brands/smart-add/enrich/<brand>  → enrich one existing brand
 *   /marketing/brands/smart-add/validate/<brand> → the validation page, opened from the brand's saved findings
 *
 * Query (lowercase names; anything invalid is dropped, never an error):
 *   via=website|social|name   the open way in (implied by a prefill when absent)
 *   website, social, platform  company/creator prefill
 *   name, city, occupation, company  person prefill (`name` + `city` also name a business)
 *   run=<uuid> (repeated)      the session's rounds, oldest first: a reload or a shared link resumes them
 *   view=compare               the side-by-side view of the findings
 *   panels=…                   owned by the window-panels URL sync (helpers: `smart_add_helper:<method>`)
 *
 * Pure: no React, no window.
 */
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { isSocialPlatform, type SocialPlatform } from "@/features/marketing/social/types";

export const SMART_ADD_BASE = "/marketing/brands/smart-add";

export type SmartAddMode = "company" | "person";
export type SmartAddVia = "website" | "social" | "name";
export type SmartAddView = "compare";

/** What a person can type into Smart Add; every field optional. */
export interface SmartAddPrefill {
  website?: string;
  social?: string;
  platform?: SocialPlatform;
  name?: string;
  city?: string;
  occupation?: string;
  company?: string;
}

export interface SmartAddAddress {
  /** Null on the enrich path and on the bare (redirecting) path. */
  mode: SmartAddMode | null;
  enrichBrandId: string | null;
  /** The open way in: `via=` when present, else what the prefill implies. */
  via: SmartAddVia | null;
  /** Only an explicit `via=` (what Back/Forward move between). */
  viaParam: SmartAddVia | null;
  prefill: SmartAddPrefill;
  runs: string[];
  view: SmartAddView | null;
}

const VIAS: readonly SmartAddVia[] = ["website", "social", "name"];
const TEXT_KEYS = ["website", "social", "name", "city", "occupation", "company"] as const;
type TextKey = (typeof TEXT_KEYS)[number];
/** Every query name this module owns (anything else, e.g. `panels`, passes through untouched). */
export const SMART_ADD_PARAMS = ["via", ...TEXT_KEYS, "platform", "run", "view"] as const;

const MAX_TEXT = 300;
const MAX_RUNS = 20;
/** A brand id or readable key: one path segment, nothing that could escape it. */
const BRAND_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** Case-insensitive read of one query name (canonical names are lowercase). */
function readAll(search: URLSearchParams, key: string): string[] {
  const out: string[] = [];
  search.forEach((value, k) => {
    if (k.toLowerCase() === key) out.push(value);
  });
  return out;
}

function cleanText(value: string | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex
  const v = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return v && v.length <= MAX_TEXT ? v : undefined;
}

/** `/company` | `/person` | `/enrich/<id>` (with or without the base); anything else is null. */
export function parseSmartAddPath(pathname: string): Pick<SmartAddAddress, "mode" | "enrichBrandId"> {
  const rest = pathname.startsWith(SMART_ADD_BASE) ? pathname.slice(SMART_ADD_BASE.length) : pathname;
  const parts = rest.split("/").filter(Boolean);
  const head = parts[0]?.toLowerCase();
  if (head === "company" || head === "person") return { mode: head, enrichBrandId: null };
  if (head === "enrich" && parts[1] && BRAND_SEGMENT.test(parts[1])) return { mode: null, enrichBrandId: parts[1] };
  return { mode: null, enrichBrandId: null };
}

/** The address → typed state. Never throws; an invalid value is simply absent. */
export function parseSmartAddUrl(pathname: string, search: URLSearchParams | string): SmartAddAddress {
  const q = typeof search === "string" ? new URLSearchParams(search) : search;
  const first = (key: string) => readAll(q, key)[0];
  const prefill: SmartAddPrefill = {};
  for (const key of TEXT_KEYS) {
    const v = cleanText(first(key));
    if (v) prefill[key] = v;
  }
  const platform = first("platform")?.toLowerCase();
  if (platform && isSocialPlatform(platform) && prefill.social) prefill.platform = platform;
  const viaRaw = first("via")?.toLowerCase() as SmartAddVia | undefined;
  const path = parseSmartAddPath(pathname);
  const viaParam = viaRaw && VIAS.includes(viaRaw) ? viaRaw : null;
  const via = viaParam ?? impliedVia(prefill, path.mode);
  const runs = [...new Set(readAll(q, "run").flatMap((r) => r.split(",")).map((r) => r.trim().toLowerCase()))]
    .filter((r) => isUuidShape(r))
    .slice(0, MAX_RUNS);
  const view = first("view")?.toLowerCase() === "compare" ? "compare" : null;
  return { ...path, via, viaParam, prefill, runs, view };
}

/** A prefill opens its own way in: a website → the website card, a handle → social, a name → name; /person → name. */
export function impliedVia(prefill: SmartAddPrefill, mode: SmartAddMode | null): SmartAddVia | null {
  // /person opens on the name, occupation, company and city fields unless a handle or site came with it.
  if (mode === "person" && (prefill.name || (!prefill.website && !prefill.social))) return "name";
  if (prefill.website) return "website";
  if (prefill.social) return "social";
  if (prefill.name) return "name";
  return null;
}

/** True when the address carries something to search for (a deep link that may start a run). */
export function hasSmartAddPrefill(a: Pick<SmartAddAddress, "mode" | "prefill">): boolean {
  const p = a.prefill;
  return a.mode === "person" ? Boolean(p.name || p.social || p.website) : Boolean(p.website || p.social || p.name);
}

export interface SmartAddLink extends SmartAddPrefill {
  mode?: SmartAddMode;
  via?: SmartAddVia | null;
  runs?: string[];
  view?: SmartAddView | null;
}

/** A change to the address: `undefined` keeps a key, `null` (or "") removes it. */
export type SmartAddPatch = { [K in keyof SmartAddPrefill]?: SmartAddPrefill[K] | null } & {
  via?: SmartAddVia | null;
  runs?: string[];
  view?: SmartAddView | null;
};

/** Typing updates the address this long after the last key (replace, never a history entry). */
export const SMART_ADD_ADDRESS_DEBOUNCE_MS = 400;

/**
 * Write this module's keys onto `base` (other keys, e.g. `panels`, are kept). `undefined` leaves a key
 * as it is; `null` / "" removes it. Order is canonical so equal states give equal strings.
 */
export function patchSmartAddSearch(base: URLSearchParams | string, patch: SmartAddPatch): URLSearchParams {
  const src = typeof base === "string" ? new URLSearchParams(base) : base;
  const owned = new Set<string>(SMART_ADD_PARAMS);
  const current = parseSmartAddUrl("", src);
  const next: Record<string, string | string[] | null> = {
    via: patch.via === undefined ? current.viaParam : patch.via,
    view: patch.view === undefined ? current.view : patch.view,
    run: patch.runs === undefined ? current.runs : patch.runs,
    platform: patch.platform === undefined ? current.prefill.platform ?? null : patch.platform ?? null,
  };
  for (const key of TEXT_KEYS) next[key] = patch[key] === undefined ? current.prefill[key] ?? null : patch[key] ?? null;
  const out = new URLSearchParams();
  for (const key of SMART_ADD_PARAMS) {
    const v = next[key];
    if (Array.isArray(v)) {
      for (const r of v.filter((x) => isUuidShape(x)).slice(0, MAX_RUNS)) out.append(key, r);
      continue;
    }
    if (key === "via" && v && !VIAS.includes(v as SmartAddVia)) continue;
    if (key === "platform" && v && !isSocialPlatform(v)) continue;
    const text = key === "via" || key === "view" || key === "platform" ? v : cleanText(v ?? undefined);
    if (text) out.set(key, text);
  }
  src.forEach((value, key) => {
    if (!owned.has(key.toLowerCase())) out.append(key, value);
  });
  return out;
}

function withQuery(path: string, q: URLSearchParams): string {
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Path of one mode. */
export function smartAddPath(mode: SmartAddMode = "company"): string {
  return `${SMART_ADD_BASE}/${mode}`;
}

/**
 * THE link to Smart Add. A prefill makes it a deep link: opened from a link, it starts searching at once
 * (and spends points, like pressing Go). `smartAddHref()` = the company page, nothing typed.
 */
export function smartAddHref(link: SmartAddLink = {}): string {
  const { mode, ...rest } = link;
  const q = patchSmartAddSearch(new URLSearchParams(), rest);
  return withQuery(smartAddPath(mode ?? "company"), q);
}

/**
 * Enrich one existing brand through Smart Add. `carry` is the website and account already typed or confirmed in
 * a session (the "you already have this brand" notice): they ride the address and join the run as the person's answers.
 */
export function smartAddEnrichHref(brandId: string, carry: Pick<SmartAddPrefill, "website" | "social" | "platform"> = {}): string {
  const q = patchSmartAddSearch(new URLSearchParams(), { website: carry.website, social: carry.social, platform: carry.platform });
  return withQuery(`${SMART_ADD_BASE}/enrich/${encodeURIComponent(brandId)}`, q);
}

/** The validation page for one brand, opened from its saved findings (validate/SmartAddValidatePage). */
export function smartAddValidateHref(brandId: string): string {
  return `${SMART_ADD_BASE}/validate/${encodeURIComponent(brandId)}`;
}

/** `/validate/<brand>` (with or without the base) → the brand id; anything else is null. */
export function parseValidatePath(pathname: string): string | null {
  const rest = pathname.startsWith(SMART_ADD_BASE) ? pathname.slice(SMART_ADD_BASE.length) : pathname;
  const parts = rest.split("/").filter(Boolean);
  return parts[0]?.toLowerCase() === "validate" && parts[1] && BRAND_SEGMENT.test(parts[1]) ? parts[1] : null;
}

/**
 * Who renders a `/validate/<brand>` address: the live session that just created that brand (it keeps its
 * state, so the switch after Create never remounts) or the saved-data page (a reload, a link, Back/Forward).
 */
export function validateAddressOwner(pathBrandId: string | null, liveBrandId: string | null): "saved" | "live" | null {
  if (!pathBrandId) return null;
  return pathBrandId === liveBrandId ? "live" : "saved";
}
