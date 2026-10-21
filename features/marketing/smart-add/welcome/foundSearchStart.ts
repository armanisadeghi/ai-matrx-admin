/**
 * Sign-up welcome — the ONE start of a found-search round, for every starter (SIGNUP-WELCOME.md § The flow).
 *
 * Two starters run it, each with its own transport:
 * - the SERVER, at sign-in (foundSearchAtSignIn.ts: the email-confirm link, the OAuth callback, a password sign-in),
 *   after the response is sent, so it never waits on the person and never depends on their browser staying;
 * - the browser (foundSearchBackground.ts), for a later round on new information and as the retry when a server
 *   start did not land.
 *
 * No browser, no React, no store here: every read and write is a dependency. The rules (when to start, what the first
 * round sends, the state recorded BEFORE the start so two starters never pay twice) live only here.
 */

import type { User } from "@supabase/supabase-js";
import type { KnownDomainRule } from "@/lib/web-domains/registry";
import type { SocialSeed } from "../evidence";
import { loginSeed, type LoginSeed } from "./loginSeed";
import { welcomeFirstRound } from "./welcomeRound";
import { MAX_WELCOME_ROUNDS, roundSubject, welcomeSubject } from "./welcomeSession";
import { foundSearchState, lightBasis, type FoundSearchState } from "./foundSearchState";

/** New information beyond the login: a profile website or account, a name. */
export interface FoundSearchInfo {
  name?: string | null;
  website?: string | null;
  socials?: SocialSeed[];
}

/** The state patch as the auth user's `user_metadata` keys (null removes a key). */
export function foundStateMetadata(patch: Partial<FoundSearchState>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if ("startedAt" in patch) data.found_search_started_at = patch.startedAt;
  if ("round" in patch) data.found_search_round = patch.round;
  if ("basis" in patch) data.found_search_basis = patch.basis;
  if ("checkedAt" in patch) data.found_search_checked_at = patch.checkedAt;
  if ("shownAt" in patch) data.found_search_shown_at = patch.shownAt;
  return data;
}

/** The pieces of information a round searched with, as stable keys (what makes a later round "new"). */
export function basisOf(seed: LoginSeed, info: FoundSearchInfo = {}): string[] {
  const keys = [
    ...(seed.name ? [`name:${seed.name.toLowerCase()}`] : []),
    ...(info.name ? [`name:${info.name.trim().toLowerCase()}`] : []),
    ...(seed.emailProven && seed.email ? [`email:${seed.email}`] : []),
    ...(seed.workspaceDomain ? [`website:${seed.workspaceDomain}`] : []),
    ...(info.website ? [`website:${info.website.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "")}`] : []),
    ...(seed.githubLogin ? [`social:github:${seed.githubLogin.toLowerCase()}`] : []),
    ...(info.socials ?? []).map((s) => `social:${(s.platform ?? "").toLowerCase()}:${s.handle_or_url.trim().toLowerCase()}`),
    ...seed.providers.filter((p) => p !== "email").map((p) => `identity:${p}`),
  ];
  return [...new Set(keys)];
}

/** Everything a starter supplies: the account as the auth server has it now, and its own transport. */
export interface FoundSearchStartDeps {
  /** The account read fresh from the auth server (never a token's copy: it may predate an earlier start). */
  freshUser(): Promise<User | null>;
  /** The known-domain registry, or null when it could not be read (the email domain then is never a website). */
  rules(): Promise<readonly KnownDomainRule[] | null>;
  /** The organization the run is made in. */
  organizationId(): Promise<string>;
  writeState(patch: Partial<FoundSearchState>): Promise<void>;
  /** Whether round `subject` already has a run (later rounds only). */
  runExists(subject: string, organizationId: string): Promise<boolean>;
  startRun(input: { subject: string; organizationId: string; inputs: Record<string, unknown> }): Promise<{ runId: string }>;
}

export type FoundSearchStartResult =
  | { outcome: "started"; round: number; runId: string; subject: string }
  /** Nothing to search with yet: recorded, and the next piece of information starts it. */
  | { outcome: "waiting" }
  /** Already started, told, marked to skip, or nothing new: nothing was done. */
  | { outcome: "nothing" };

/**
 * Start a round. The first one (`info` empty) is exactly the door's first round; a later one carries the new
 * information on a new subject suffix. Records the state BEFORE it starts, so two starters never pay twice; a start
 * that fails puts everything back, so the next starter tries again.
 */
export async function startFoundSearchWith(deps: FoundSearchStartDeps, info: FoundSearchInfo = {}): Promise<FoundSearchStartResult> {
  const user = await deps.freshUser();
  if (!user) return { outcome: "nothing" };
  const state = foundSearchState(user);
  if (state.skip || state.shownAt) return { outcome: "nothing" };
  const seed = loginSeed(user, await deps.rules());
  // The light keys the island compares on every load are always recorded too, so it never wakes for nothing.
  const basis = [...new Set([...basisOf(seed, info), ...lightBasis(user)])];
  const later = Boolean(state.startedAt);
  // Never a loop: a later round only for a piece of information no earlier round had.
  if (later && basis.every((k) => state.basis.includes(k))) return { outcome: "nothing" };
  const name = seed.name ?? info.name ?? null;
  const round = welcomeFirstRound(name && !seed.name ? { ...seed, name } : seed);
  const now = new Date().toISOString();
  if (!round) {
    // Nothing to search with yet (no name, no proven email): wait for new information.
    await deps.writeState({ startedAt: now, basis, checkedAt: now, round: -1 });
    return { outcome: "waiting" };
  }
  const extra = { website: info.website ?? "", socials: info.socials ?? [] };
  const inputs = {
    ...round.inputs,
    website: extra.website || round.seeds.website,
    socials: [...round.seeds.socials, ...extra.socials],
  };
  const organizationId = await deps.organizationId();
  const base = welcomeSubject(user.id);
  let n: number | null = 0;
  if (later) {
    n = null;
    for (let k = state.round + 1; k < MAX_WELCOME_ROUNDS; k++) {
      if (!(await deps.runExists(roundSubject(base, k), organizationId))) {
        n = k;
        break;
      }
    }
  }
  if (n === null) return { outcome: "nothing" };
  await deps.writeState({ startedAt: now, round: n, basis: [...new Set([...state.basis, ...basis])], checkedAt: null });
  const subject = roundSubject(base, n);
  try {
    const { runId } = await deps.startRun({ subject, organizationId, inputs });
    return { outcome: "started", round: n, runId, subject };
  } catch (error) {
    // Not started: everything goes back as it was, so the next starter (a load, a save) tries again.
    await deps
      .writeState({ startedAt: later ? state.startedAt : null, round: state.round, basis: state.basis, checkedAt: state.checkedAt })
      .catch(() => undefined);
    throw error;
  }
}
