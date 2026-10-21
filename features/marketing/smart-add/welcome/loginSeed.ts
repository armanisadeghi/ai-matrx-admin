/**
 * Sign-up welcome — what the login alone tells us (SIGNUP-WELCOME.md step 1; smart-add VISION Part 29). Pure.
 *
 * Identity claims (owning an email, an account, a domain) come ONLY from the sign-in provider's own record
 * (`user.identities[].identity_data`, its `provider`) and from `user.email` once `email_confirmed_at` is set.
 * The NAME is different: a name the person typed at sign-up (`user_metadata.full_name` / `name`) is their own word,
 * which Smart Add counts as certain (Part 15: never ask what the data answers). Order: the provider's name, the name
 * they typed, then the email's name hint (`jane.doe@` → "Jane Doe"). No name at all → the door asks once.
 *
 * A free-mail domain (`web.domain_category` `free_mail`, through the one registry in lib/web-domains) is never a
 * website; a role mailbox (info@, support@) names a business, never a person. A work email's domain or a Google
 * Workspace domain is a website CANDIDATE only (often an employer's): it becomes "Your site" when the run shows the
 * site is theirs (siteTheirs.ts), never from the login alone.
 *
 * `seedEvidence` turns the proven values into the Smart Add evidence the session already understands: typed items
 * (`source.kind: "typed"`, confidence 1, keys from `customItem`), which `found/foundCards.ts` counts as certain.
 */

import type { User } from "@supabase/supabase-js";
import { liveKnownDomainRules, ruleFor, type KnownDomainRule } from "@/lib/web-domains/registry";
import { normalizeEmail } from "../emailInput";
import { isPlaceholderName } from "../placeholderName";
import { customItem, type Decision, type EvidenceItem } from "../evidence";

/**
 * Local parts that name a role or a mailbox, never a person. Mirrors aidream
 * `services/brand_intake/email_clues.py` `ROLE_LOCAL_PARTS` (the server reads every email clue from it).
 */
export const ROLE_LOCAL_PARTS: ReadonlySet<string> = new Set([
  "info", "hello", "hi", "contact", "admin", "support", "sales", "office", "team", "mail", "email", "help",
  "billing", "accounts", "noreply", "no-reply", "service", "marketing", "press", "media", "jobs", "careers",
  "hr", "inquiries", "enquiries", "booking", "bookings", "orders", "webmaster", "postmaster", "github", "dev",
]);

export interface LoginSeed {
  /** The person's name: the sign-in provider's, else the one they typed at sign-up, else the email's name hint. */
  name: string | null;
  /** Where `name` came from. */
  nameFrom: "provider" | "typed" | "email" | null;
  /** The provider's profile picture. */
  avatarUrl: string | null;
  email: string | null;
  /** The email is confirmed (`email_confirmed_at`): it is theirs. */
  emailProven: boolean;
  /** Every sign-in provider on the account (`google`, `github`, `apple`, `email`…), first linked first. */
  providers: string[];
  /** Google Workspace domain (`custom_claims.hd`): the domain is theirs (or their employer's). */
  workspaceDomain: string | null;
  /** GitHub login (`user_name`, else `preferred_username`): the account is theirs. */
  githubLogin: string | null;
  emailDomain: string | null;
  /** The email domain is a free mailbox host. null = the domain registry has not loaded, so it is not known yet. */
  freeMail: boolean | null;
  /** The local part is a role mailbox (info@, support@): it names a business, never a person. */
  roleMailbox: boolean;
}

type IdentityData = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
/** A name field: a placeholder ("Unknown", "n/a") is no name at all. */
const nameStr = (v: unknown): string | null => {
  const s = str(v);
  return s && !isPlaceholderName(s) ? s : null;
};

/** Providers that carry a person's own name and picture, best first; the rest follow in linked order. */
const PROFILE_ORDER = ["google", "github", "apple", "azure", "linkedin_oidc", "twitter", "facebook"];

function identitiesOf(user: User): { provider: string; data: IdentityData }[] {
  return (user.identities ?? []).map((i) => ({ provider: i.provider, data: (i.identity_data ?? {}) as IdentityData }));
}

function byProfileOrder<T extends { provider: string }>(ids: T[]): T[] {
  const rank = (p: string) => {
    const n = PROFILE_ORDER.indexOf(p);
    return n === -1 ? PROFILE_ORDER.length : n;
  };
  return ids.map((x, n) => ({ x, n })).sort((a, b) => rank(a.x.provider) - rank(b.x.provider) || a.n - b.n).map((y) => y.x);
}

/** A domain as a host: lower-cased, no scheme, no www, no path. */
function bareDomain(v: string | null): string | null {
  if (!v) return null;
  const d = v.toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

/** Is `domain` a free mailbox host? null when the registry has no rules loaded (unknown, never guessed). */
export function isFreeMailDomain(domain: string, rules: readonly KnownDomainRule[] | null): boolean | null {
  if (!rules?.length) return null;
  return ruleFor(domain, ["free_mail"], rules) !== null;
}

/** The local part names a role or a shared mailbox (`info@`, `support+x@`). */
export function isRoleMailbox(email: string): boolean {
  const local = email.slice(0, email.lastIndexOf("@")).split("+")[0]?.toLowerCase() ?? "";
  return ROLE_LOCAL_PARTS.has(local);
}

/**
 * What the login proves. `rules` = the known-domain registry (lib/web-domains); defaults to the rules the live
 * reader last loaded. Without rules `freeMail` stays null and the email domain never becomes a website.
 */
export function loginSeed(user: User, rules: readonly KnownDomainRule[] | null = liveKnownDomainRules()): LoginSeed {
  const ids = identitiesOf(user);
  const ordered = byProfileOrder(ids);
  const first = (pick: (d: IdentityData) => string | null) => {
    for (const i of ordered) {
      const v = pick(i.data);
      if (v) return v;
    }
    return null;
  };
  const providerName = first((d) => nameStr(d.full_name) ?? nameStr(d.name));
  const meta = (user.user_metadata ?? {}) as IdentityData;
  const typedName = nameStr(meta.full_name) ?? nameStr(meta.name);
  const avatarUrl = first((d) => str(d.avatar_url) ?? str(d.picture));
  const google = ids.find((i) => i.provider === "google");
  const claims = (google?.data.custom_claims ?? null) as IdentityData | null;
  const workspaceDomain = bareDomain(str(claims?.hd));
  const github = ids.find((i) => i.provider === "github");
  const githubLogin = github ? (str(github.data.user_name) ?? str(github.data.preferred_username)) : null;

  const email = normalizeEmail(user.email);
  const emailProven = Boolean(email && user.email_confirmed_at);
  const emailDomain = email ? (email.split("@").pop() ?? null) : null;
  const roleMailbox = email ? isRoleMailbox(email) : false;
  const hint = email && !roleMailbox ? emailNameHint(email) : null;
  const name = providerName ?? typedName ?? hint;
  return {
    name,
    nameFrom: providerName ? "provider" : typedName ? "typed" : hint ? "email" : null,
    avatarUrl,
    email,
    emailProven,
    providers: [...new Set(ids.map((i) => i.provider))],
    workspaceDomain,
    githubLogin,
    emailDomain,
    freeMail: emailDomain ? isFreeMailDomain(emailDomain, rules) : null,
    roleMailbox,
  };
}

/**
 * The one name rule: the provider's name > the name typed at sign-up > a name the email step PROVED on a GitHub
 * account (`provenProfileName`) > the email's two-word hint > none. `seed.name` already carries the first, second
 * and last; the proven GitHub name outranks only the email hint.
 */
export function resolveName(seed: LoginSeed, provenName: string | null): string | null {
  if (seed.nameFrom === "provider" || seed.nameFrom === "typed") return seed.name;
  return provenName ?? seed.name;
}

/**
 * A name read off the part before the @: two or three plain words (`jane.doe`, `mary_ann.lee`). A part holding a
 * digit is an id, not a word (`jane.doe.a1b2c3` → "Jane Doe"); a single word is never a full name (`jdoe`), and a
 * mailbox word never names anyone (`sales.team`).
 * Stricter twin of aidream `email_clues._name_hint`.
 */
export function emailNameHint(email: string): string | null {
  const local = email.slice(0, email.lastIndexOf("@")).split("+")[0] ?? "";
  const words = local.split(/[._-]+/).filter((w) => w && !/\d/.test(w));
  // A mailbox word (sales.team@, info.desk@) is never part of a person's name.
  if (words.length < 2 || words.length > 3 || words.some((w) => w.length < 2 || !/^\p{L}+$/u.test(w) || ROLE_LOCAL_PARTS.has(w.toLowerCase())))
    return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * The website the login POINTS AT: the Google Workspace domain, else a confirmed email's domain when it is known not
 * to be free mail and the address is not a role mailbox. A candidate only: an employer's domain is not the person's
 * site. The first round searches it; siteTheirs.ts decides whether it is theirs.
 */
export function websiteCandidate(seed: LoginSeed): string | null {
  if (seed.workspaceDomain) return seed.workspaceDomain;
  if (seed.emailProven && seed.emailDomain && seed.freeMail === false && !seed.roleMailbox) return seed.emailDomain;
  return null;
}

const FROM_LOGIN = { node: "login", kind: "typed", url: null, where: "your sign-in" } as const;

/** The login's proven values as typed evidence: the email and the GitHub account (never the website candidate). */
export function seedEvidence(seed: LoginSeed): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  if (seed.emailProven && seed.email) items.push(customItem("email", seed.email));
  if (seed.githubLogin) {
    const url = `https://github.com/${seed.githubLogin}`;
    items.push(customItem("social", url, { platform: "github", handle: seed.githubLogin, url, label: seed.githubLogin }));
  }
  return items.map((i) => ({ ...i, source: { ...FROM_LOGIN } }));
}

/** Every seeded item answered "yes": the login already proved it. */
export function seedDecisions(items: readonly EvidenceItem[]): Record<string, Decision> {
  return Object.fromEntries(items.map((i) => [i.key, "yes" as const]));
}

/**
 * A name the email step PROVED: the profile name on a GitHub account the email lookup found with proof
 * (`certainty: "certain"`, aidream email_lookups.github_stance). Two words at least, never the login itself or a
 * placeholder. Gravatar's display name is not read here: its items carry it only inside a free-form evidence line.
 */
export function provenProfileName(items: Iterable<EvidenceItem>): string | null {
  for (const i of items) {
    if (i.field !== "social" || i.platform !== "github" || i.source.kind !== "social_profile" || i.certainty !== "certain") continue;
    const name = (i.label ?? "").trim().replace(/\s+/g, " ");
    if (name.split(" ").length < 2 || isPlaceholderName(name) || name.toLowerCase() === (i.handle ?? "").toLowerCase()) continue;
    return name;
  }
  return null;
}
