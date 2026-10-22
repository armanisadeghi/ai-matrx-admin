/**
 * Sign-up welcome — the session's pure rules (SIGNUP-WELCOME.md steps 3–6). No React, no I/O.
 *
 * - One session per person: every round of the welcome has a stable key, `signup_welcome:<user id>` for the
 *   first, `…:2`, `…:3` for the next, carried as a stable `smart_add:<uuid>` run subject (roundSubject), so a reload
 *   finds each round again (GET runs?subject=) and never pays twice.
 * - An admin's test login (debug mode only) replaces the seed for that session; its subject is
 *   `signup_welcome:test:<hash of the values>`, so the same values resume the same test session.
 * - "None of these" narrows the next round with one typed value: a company when it reads like one, else a city.
 * - The paid cards (what buyers search, a competitor) run only for a site that is not a free host.
 */

import type { User } from "@supabase/supabase-js";
import { ruleFor, type KnownDomainRule } from "@/lib/web-domains/registry";
import type { MarketingBrand } from "@/features/marketing/types";

export const WELCOME_SUBJECT_PREFIX = "signup_welcome:";
/** Rounds a session can resume (the anchor round, a narrowed one, the grounded ones). */
export const MAX_WELCOME_ROUNDS = 8;

export function welcomeSubject(userId: string): string {
  return `${WELCOME_SUBJECT_PREFIX}${userId}`;
}

/** Round n (0-based) of a session's logical key: the first keeps the bare key. */
export function roundKey(base: string, n: number): string {
  return n === 0 ? base : `${base}:${n + 1}`;
}

/**
 * A stable UUID for a text key (128 bits from four seeded FNV-1a passes, version 8, RFC variant). The same key always
 * gives the same id; it is an identity, never a secret.
 */
export function stableUuid(key: string): string {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map((seed) => fnv1a(key, seed)).join("");
  const v = `${hex.slice(0, 12)}8${hex.slice(13, 16)}${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 32)}`;
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20, 32)}`;
}

/**
 * The run subject of round n. The identify workflow's lane accepts only `smart_add:<uuid>` (aidream
 * system_workflows.py parse_subject), so the logical key (`signup_welcome:<user id>`, `…:2`) is carried as a stable
 * UUID: the same person's same round always looks up and rejoins the same run.
 */
export function roundSubject(base: string, n: number): string {
  return `smart_add:${stableUuid(roundKey(base, n))}`;
}

export type TestProvider = "google" | "github" | "apple" | "email";

export interface TestLogin {
  email: string;
  name: string;
  provider: TestProvider;
  workspaceDomain: string;
  githubLogin: string;
}

export const EMPTY_TEST_LOGIN: TestLogin = { email: "", name: "", provider: "google", workspaceDomain: "", githubLogin: "" };

/** FNV-1a, 32-bit, hex: a short stable id for a set of test values (never a secret). */
export function fnv1a(text: string, seed = 0x811c9dc5): string {
  let h = seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const clean = (t: TestLogin): TestLogin => ({
  email: t.email.trim().toLowerCase(),
  name: t.name.trim().replace(/\s+/g, " "),
  provider: t.provider,
  workspaceDomain: t.workspaceDomain.trim().toLowerCase(),
  githubLogin: t.githubLogin.trim().replace(/^@/, ""),
});

export function testSubject(t: TestLogin): string {
  const c = clean(t);
  return `${WELCOME_SUBJECT_PREFIX}test:${fnv1a(JSON.stringify([c.email, c.name, c.provider, c.workspaceDomain, c.githubLogin]))}`;
}

/** A test login has something to search with: a name or a confirmed email. */
export function testLoginUsable(t: TestLogin): boolean {
  const c = clean(t);
  return Boolean(c.name || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email));
}

/**
 * The auth user a test login stands for, shaped like Supabase's own: the provider's identity carries the name, the
 * email, the Workspace domain (`custom_claims.hd`) and the GitHub login, exactly where loginSeed reads them.
 */
export function testLoginUser(t: TestLogin): User {
  const c = clean(t);
  const data: Record<string, unknown> = {
    ...(c.name ? { full_name: c.name, name: c.name } : {}),
    ...(c.email ? { email: c.email, email_verified: true } : {}),
    ...(c.provider === "google" && c.workspaceDomain ? { custom_claims: { hd: c.workspaceDomain } } : {}),
    ...(c.provider === "github" && c.githubLogin ? { user_name: c.githubLogin } : {}),
  };
  const identities = [{ id: "test", identity_id: "test", user_id: "test", provider: c.provider, identity_data: data }];
  // A GitHub login given with another provider is still a linked GitHub identity.
  if (c.provider !== "github" && c.githubLogin)
    identities.push({ id: "test-gh", identity_id: "test-gh", user_id: "test", provider: "github", identity_data: { user_name: c.githubLogin } });
  return {
    id: "test",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
    email: c.email || undefined,
    email_confirmed_at: c.email ? new Date(0).toISOString() : undefined,
    identities: identities as unknown as User["identities"],
  } as User;
}

/** Business words that stand alone ("Inc", "LLC", "Studio"). "Co" is NOT here: see COMPANY_CO. */
const COMPANY_WORDS =
  /\b(inc|llc|ltd|corp|company|group|studio|studios|agency|labs?|partners|associates|consulting|solutions|media|bank|university|college|school|hospital|clinic|foundation|tv|news)\b\.?/i;

/** "Co" is a business word only as "Co." (with its period) or "& Co" / "and Co"; a bare "CO" is Colorado. */
const COMPANY_CO = /\bco\./i;
const COMPANY_AND_CO = /(?:&|\band)\s*co\b/i;

/** US states, DC, territories and Canadian provinces: the code or the name that closes a "City, State" line. */
const REGION_CODES =
  "al ak az ar ca co ct de dc fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy pr gu vi as mp ab bc mb nb nl ns nt nu on pe qc sk yt";
const REGION_NAMES =
  "alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada new-hampshire new-jersey new-mexico new-york north-carolina north-dakota ohio oklahoma oregon pennsylvania rhode-island south-carolina south-dakota tennessee texas utah vermont virginia washington west-virginia wisconsin wyoming alberta british-columbia manitoba new-brunswick newfoundland nova-scotia ontario prince-edward-island quebec saskatchewan";
const REGIONS = new Set([...REGION_CODES.split(" "), ...REGION_NAMES.split(" ")]);

/** "Fort Collins, CO" / "Portland, Oregon" / "Austin, TX, USA": a place with its state after a comma. */
export function looksLikePlace(text: string): boolean {
  const parts = text.split(",").map((p) => p.trim().replace(/\.$/, ""));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !p)) return false;
  let last = parts[parts.length - 1].toLowerCase();
  if (parts.length === 3 && /^(usa|us|united states|canada)$/.test(last)) last = parts[1].toLowerCase();
  return REGIONS.has(last.replace(/\s+/g, "-"));
}

/** "None of these" → the typed value as the person's company (it reads like one) or city (everything else). */
export function narrowAs(text: string): { city: string } | { company: string } {
  const t = text.trim().replace(/\s+/g, " ");
  const head = t.split(",")[0];
  if (looksLikePlace(t) && !COMPANY_WORDS.test(head) && !COMPANY_CO.test(head)) return { city: t };
  const company = COMPANY_WORDS.test(t) || COMPANY_CO.test(t) || COMPANY_AND_CO.test(t) || /\.[a-z]{2,}$/i.test(t);
  return company ? { company: t } : { city: t };
}

/** Hosts that are never a business someone owns: mail, link-in-bio, blog and store platforms, socials. */
export const FREE_HOST_CATEGORIES = [
  "free_mail",
  "link_in_bio",
  "blog_platform",
  "platform",
  "social",
  "store_page",
  "marketplace",
  "document_host",
  "video",
  "directory",
] as const;

/**
 * The confirmed site the paid cards may run for: not a free host. null = no run. Without the registry nothing runs
 * (unknown is never guessed). A big-company signal does not exist yet (no registry category); see the report.
 */
export function paidCardsHost(host: string | null, rules: readonly KnownDomainRule[] | null): string | null {
  if (!host || !rules?.length) return null;
  return ruleFor(host, FREE_HOST_CATEGORIES, rules) ? null : host;
}

const compact = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * The names a search term can carry that make it a search FOR them, not for what they offer: the brand's name, its
 * site's name (the host without its ending), and for a person their surname ("jemisin broken earth"). Compacted, so
 * "N K Jemisin", "nk jemisin" and "nkjemisin" are one name. Under three letters never counts (it would match anything).
 */
export function ownNames(brand: { name: string; kind?: string | null }, host: string | null): string[] {
  const words = brand.name.trim().split(/\s+/).filter(Boolean);
  const site = host ? host.replace(/^www\./, "").split(".")[0] : "";
  const out = [compact(brand.name), compact(site), ...(brand.kind === "person" && words.length > 1 ? [compact(words[words.length - 1])] : [])];
  return [...new Set(out.filter((n) => n.length >= 3))];
}

/**
 * "What buyers search": at most `max` terms, highest volume first, none of them their own name. A list where every term
 * names them says nothing about their buyers: it comes back empty and the card is not shown.
 */
export function buyerTerms(keywords: readonly string[], names: readonly string[], max = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const c = compact(k);
    if (!c || seen.has(c) || names.some((n) => c.includes(n))) continue;
    seen.add(c);
    out.push(k.trim());
    if (out.length >= max) break;
  }
  return out;
}

/** Who the welcome is for: the signed-in account (or an admin's test login) and the session's stable subject. */
export interface WelcomeLogin {
  user: User;
  subject: string;
  /** An admin's test login: nothing is written to onboarding. */
  test: boolean;
}

export interface WelcomeDone {
  brand: MarketingBrand;
  /** The confirmed site the paid cards may run for (paidCardsHost), else null. */
  paidHost: string | null;
  test: boolean;
}
