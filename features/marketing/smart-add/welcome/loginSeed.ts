/**
 * Sign-up welcome — what the login alone proves (SIGNUP-WELCOME.md step 1; smart-add VISION Part 29). Pure.
 *
 * Proven values come ONLY from the sign-in provider's own record (`user.identities[].identity_data`, its
 * `provider`) and from `user.email` once `email_confirmed_at` is set. Never `user_metadata`: the person can edit it.
 * A free-mail domain (`web.domain_category` `free_mail`, through the one registry in lib/web-domains) is never a
 * website; a role mailbox (info@, support@) names a business, never a person.
 *
 * `seedEvidence` turns the proven values into the Smart Add evidence the session already understands: typed items
 * (`source.kind: "typed"`, confidence 1, keys from `customItem`), which `found/foundCards.ts` counts as certain.
 */

import type { User } from "@supabase/supabase-js";
import { liveKnownDomainRules, ruleFor, type KnownDomainRule } from "@/lib/web-domains/registry";
import { normalizeEmail } from "../emailInput";
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
  /** The account's display name as the sign-in provider gave it (Google, GitHub, Apple on first sign-in). */
  name: string | null;
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
  const name = first((d) => str(d.full_name) ?? str(d.name));
  const avatarUrl = first((d) => str(d.avatar_url) ?? str(d.picture));
  const google = ids.find((i) => i.provider === "google");
  const claims = (google?.data.custom_claims ?? null) as IdentityData | null;
  const workspaceDomain = bareDomain(str(claims?.hd));
  const github = ids.find((i) => i.provider === "github");
  const githubLogin = github ? (str(github.data.user_name) ?? str(github.data.preferred_username)) : null;

  const email = normalizeEmail(user.email);
  const emailProven = Boolean(email && user.email_confirmed_at);
  const emailDomain = email ? (email.split("@").pop() ?? null) : null;
  return {
    name,
    avatarUrl,
    email,
    emailProven,
    providers: [...new Set(ids.map((i) => i.provider))],
    workspaceDomain,
    githubLogin,
    emailDomain,
    freeMail: emailDomain ? isFreeMailDomain(emailDomain, rules) : null,
    roleMailbox: email ? isRoleMailbox(email) : false,
  };
}

/**
 * The website the login proves: the Google Workspace domain, else a confirmed email's domain when it is known not to
 * be free mail and the address is not a role mailbox. An employer's domain is a website candidate, never "your
 * business" until the person says so.
 */
export function provenWebsite(seed: LoginSeed): string | null {
  if (seed.workspaceDomain) return seed.workspaceDomain;
  if (seed.emailProven && seed.emailDomain && seed.freeMail === false && !seed.roleMailbox) return seed.emailDomain;
  return null;
}

const FROM_LOGIN = { node: "login", kind: "typed", url: null, where: "your sign-in" } as const;

/** The login's proven values as typed evidence: the email, the website, the GitHub account. */
export function seedEvidence(seed: LoginSeed): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  if (seed.emailProven && seed.email) items.push(customItem("email", seed.email));
  const website = provenWebsite(seed);
  if (website) items.push(customItem("website", website));
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
