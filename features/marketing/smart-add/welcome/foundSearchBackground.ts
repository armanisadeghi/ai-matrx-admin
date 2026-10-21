/**
 * Sign-up welcome — the found search runs in the BACKGROUND and never blocks anyone (Arman, 2026-10-17: "If you have
 * the info, you show them something. If you don't, then you do it in the background and do it again when you have
 * something"). SIGNUP-WELCOME.md § The flow.
 *
 * Loaded only on demand (FoundSearchIsland decides from the session it already holds, with zero reads, whether there
 * is anything to do). Nothing here is ever awaited on a render path.
 *
 * 1. Start once: the first signed-in load of an account that never started fires the welcome's first round — the
 *    exact round the welcome door starts (welcomeRound.ts), on the same stable subject, so the door later RESUMES it.
 * 2. Know when there is something: while the app is open, the round is checked by subject about every 30 s for up
 *    to 15 minutes after it started; a later load checks once. "Something" is the door's own rule (welcomeVerdict.ts)
 *    over the finished run's output (roundOutput.ts).
 * 3. Tell them once: one in-app notice (communication.schedule_my_notice, the bell) whose link opens the
 *    `welcomeFoundWindow` window in place — the welcome door on the same subject.
 * 4. Again only on new info: a search that found nothing runs ONE new round per new piece of information (a name,
 *    a website or account saved to their profile, a newly linked Google / GitHub sign-in), never in a loop.
 *
 * State lives on the auth user's `user_metadata` (the JWT carries it, so a later load costs nothing):
 *   found_search_started_at · found_search_round · found_search_basis · found_search_checked_at · found_search_shown_at
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import type { AppDispatch } from "@/lib/redux/store";
import { getJson } from "@/lib/python-client";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { fetchKnownDomainRules } from "@/lib/web-domains/service";
import { liveKnownDomainRules } from "@/lib/web-domains/registry";
import { lookupSystemRun } from "@/lib/workflows/system-runs";
import { addWitnesses } from "../found/foundCards";
import { mergeEvidence, type EvidenceItem, type SocialSeed } from "../evidence";
import { finishedRound } from "../roundOutput";
import { mergeFacts, type BrandFact } from "../validate/queue";
import { visibleEvidence } from "../visibleEvidence";
import type { WeThinkSuggestion } from "../weThink";
import { loginSeed, provenProfileName, type LoginSeed } from "./loginSeed";
import { IDENTIFY_WORKFLOW_KEY, startWelcomeRound, welcomeFirstRound } from "./welcomeRound";
import { MAX_WELCOME_ROUNDS, roundSubject, welcomeSubject } from "./welcomeSession";
import { welcomeFoundSomething, welcomeVerdict } from "./welcomeVerdict";
import { FOUND_WINDOW_LINK, foundSearchState, lightBasis, type FoundSearchState } from "./foundSearchState";

/** How often an open app checks a running round, and for how long after it started. */
export const FOUND_POLL_MS = 30_000;
export const FOUND_POLL_FOR_MS = 15 * 60_000;
const TERMINAL = ["completed", "failed", "errored", "cancelled", "stopped", "refused"];

/** New information beyond the login: a profile website or account, a name. */
export interface FoundSearchInfo {
  name?: string | null;
  website?: string | null;
  socials?: SocialSeed[];
}

const dispatchOf = (): AppDispatch => {
  const store = getStoreSingleton();
  if (!store) throw new Error("The app store is not ready.");
  return store.dispatch as AppDispatch;
};

async function writeState(patch: Partial<FoundSearchState>): Promise<void> {
  const data: Record<string, unknown> = {};
  if ("startedAt" in patch) data.found_search_started_at = patch.startedAt;
  if ("round" in patch) data.found_search_round = patch.round;
  if ("basis" in patch) data.found_search_basis = patch.basis;
  if ("checkedAt" in patch) data.found_search_checked_at = patch.checkedAt;
  if ("shownAt" in patch) data.found_search_shown_at = patch.shownAt;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(`The found search could not save its progress: ${error.message}`);
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

async function freshUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`The found search could not read your account: ${error.message}`);
  return data.user ?? null;
}

async function seedFor(user: User): Promise<LoginSeed> {
  const rules = await fetchKnownDomainRules().catch(() => liveKnownDomainRules());
  return loginSeed(user, rules);
}

/** The first free round index of this session (rounds the welcome door ran itself count too). */
async function nextRound(dispatch: AppDispatch, base: string, organizationId: string, from: number): Promise<number | null> {
  for (let n = from; n < MAX_WELCOME_ROUNDS; n++) {
    const run = await lookupSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, roundSubject(base, n), organizationId, "This session could not be read.");
    if (!run) return n;
  }
  return null;
}

/**
 * Start a round in the background. The first one (`info` empty) is exactly the door's first round; a later one
 * carries the new information on a new subject suffix. Records the state BEFORE it starts, so two tabs never pay twice.
 */
export async function startFoundSearch(info: FoundSearchInfo = {}): Promise<void> {
  const dispatch = dispatchOf();
  const user = await freshUser();
  if (!user) return;
  const state = foundSearchState(user);
  if (state.skip || state.shownAt) return;
  const seed = await seedFor(user);
  // The light keys the island compares on every load are always recorded too, so it never wakes for nothing.
  const basis = [...new Set([...basisOf(seed, info), ...lightBasis(user)])];
  const later = Boolean(state.startedAt);
  // Never a loop: a later round only for a piece of information no earlier round had.
  if (later && basis.every((k) => state.basis.includes(k))) return;
  const name = seed.name ?? info.name ?? null;
  const round = welcomeFirstRound(name && !seed.name ? { ...seed, name } : seed);
  const now = new Date().toISOString();
  if (!round) {
    // Nothing to search with yet (no name, no proven email): wait for new information.
    await writeState({ startedAt: now, basis, checkedAt: now, round: -1 });
    return;
  }
  const extra = { website: info.website ?? "", socials: info.socials ?? [] };
  const inputs = {
    ...round.inputs,
    website: extra.website || round.seeds.website,
    socials: [...round.seeds.socials, ...extra.socials],
  };
  const organizationId = await ensureOrgId(null);
  const base = welcomeSubject(user.id);
  const n = later ? await nextRound(dispatch, base, organizationId, state.round + 1) : 0;
  if (n === null) return;
  await writeState({ startedAt: now, round: n, basis: [...new Set([...state.basis, ...basis])], checkedAt: null });
  try {
    await startWelcomeRound(dispatch, { base, n, inputs, organizationId });
  } catch (error) {
    // Not started: everything goes back as it was, so the next load (or the next save) tries again.
    await writeState({ startedAt: later ? state.startedAt : null, round: state.round, basis: state.basis, checkedAt: state.checkedAt }).catch(
      () => undefined,
    );
    throw error;
  }
}

/** Everything the session's rounds found so far, as the door would show it, and whether to tell the person. */
async function verdictFor(dispatch: AppDispatch, user: User, rounds: number, organizationId: string) {
  const seed = await seedFor(user);
  const first = welcomeFirstRound(seed);
  let items = mergeEvidence(new Map<string, EvidenceItem>(), first?.items ?? []);
  let witnesses = addWitnesses(new Map(), []);
  let facts: BrandFact[] = [];
  let suggestions: Record<string, WeThinkSuggestion> = {};
  for (let n = 0; n <= rounds; n++) {
    const run = await lookupSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, roundSubject(welcomeSubject(user.id), n), organizationId, "This session could not be read.");
    if (!run) continue;
    const { data } = await getJson<{ output?: Record<string, unknown> | null }>(`/runs/${run.runId}`);
    const r = finishedRound(data.output);
    items = mergeEvidence(items, r.evidence);
    witnesses = addWitnesses(witnesses, r.evidence);
    facts = mergeFacts(facts, r.facts);
    suggestions = { ...suggestions, ...r.suggestions };
  }
  const decisions = first?.decisions ?? {};
  const visible = visibleEvidence(items.values(), decisions, true, suggestions);
  const name = seed.name ?? provenProfileName(visible) ?? "";
  const verdict = welcomeVerdict({ items: visible, witnesses, facts, decisions, seed, name });
  return { verdict, seed };
}

export type FoundCheck = "running" | "nothing" | "told" | "none";

/** Check the latest round once: still running, nothing found (recorded), or something (the notice is sent). */
export async function checkFoundSearch(): Promise<FoundCheck> {
  const dispatch = dispatchOf();
  const user = await freshUser();
  if (!user) return "none";
  const state = foundSearchState(user);
  if (state.skip || !state.startedAt || state.shownAt || state.checkedAt || state.round < 0) return "none";
  const organizationId = await ensureOrgId(null);
  const run = await lookupSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, roundSubject(welcomeSubject(user.id), state.round), organizationId, "This session could not be read.");
  if (run && !TERMINAL.includes(run.status)) return "running";
  const { verdict, seed } = await verdictFor(dispatch, user, state.round, organizationId);
  const now = new Date().toISOString();
  if (!welcomeFoundSomething(verdict)) {
    await writeState({ checkedAt: now });
    return "nothing";
  }
  const ask = verdict.people.people.length > 0 && !verdict.anchored;
  const { error } = await supabase.schema("communication").rpc("schedule_my_notice", {
    p_deliver_at: now,
    p_subject: { title: ask ? "Is this you?" : "We found you", body: ask ? "Pick the one that's you." : "See what we found." },
    p_deep_link: FOUND_WINDOW_LINK,
    p_source_key: `signup_welcome:found:${seed.email ?? user.id}`,
    p_organization_id: organizationId,
  });
  if (error) throw new Error(`The found-you notice could not be sent: ${error.message}`);
  await writeState({ shownAt: now, checkedAt: now });
  return "told";
}

/**
 * Keep checking while the app is open: every 30 s until the round settles or 15 minutes after it started; a later
 * load checks once. Returns a stop function.
 */
export function watchFoundSearch(startedAt: string | null): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const until = (startedAt ? Date.parse(startedAt) : Date.now()) + FOUND_POLL_FOR_MS;
  const tick = async () => {
    if (stopped) return;
    try {
      const result = await checkFoundSearch();
      if (result !== "running" || Date.now() + FOUND_POLL_MS > until) return;
    } catch (error) {
      console.error("[found-search] The check failed; the next load tries again.", error);
      return;
    }
    if (!stopped) timer = setTimeout(() => void tick(), FOUND_POLL_MS);
  };
  void tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** A save brought new information (a profile website or account, a name): one new round if it is new and nothing was found. */
export async function foundSearchNewInfo(info: FoundSearchInfo): Promise<void> {
  const user = await freshUser();
  if (!user) return;
  const state = foundSearchState(user);
  if (state.skip || state.shownAt || !state.checkedAt) return;
  await startFoundSearch(info);
  watchFoundSearch(new Date().toISOString());
}
