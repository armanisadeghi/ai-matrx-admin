/**
 * Sign-up welcome — the session's pure rules (SIGNUP-WELCOME.md steps 3–6). No React, no I/O.
 *
 * - One session per person: every round of the welcome has a stable subject, `signup_welcome:<user id>` for the
 *   first, `…:2`, `…:3` for the next, so a reload finds each round again (GET runs?subject=) and never pays twice.
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

/** Round n (0-based) of a session: the first keeps the bare subject. */
export function roundSubject(base: string, n: number): string {
  return n === 0 ? base : `${base}:${n + 1}`;
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
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
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

const COMPANY_WORDS =
  /\b(inc|llc|ltd|corp|co|company|group|studio|studios|agency|labs?|partners|associates|consulting|solutions|media|bank|university|college|school|hospital|clinic|foundation|tv|news)\b\.?/i;

/** "None of these" → the typed value as the person's company (it reads like one) or city (everything else). */
export function narrowAs(text: string): { city: string } | { company: string } {
  const t = text.trim().replace(/\s+/g, " ");
  return COMPANY_WORDS.test(t) || /\.[a-z]{2,}$/i.test(t) ? { company: t } : { city: t };
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
