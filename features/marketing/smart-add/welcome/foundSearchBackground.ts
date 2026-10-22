/**
 * Sign-up welcome — the found search runs in the BACKGROUND and never blocks anyone (Arman, 2026-10-17: "If you have
 * the info, you show them something. If you don't, then you do it in the background and do it again when you have
 * something"). SIGNUP-WELCOME.md § The flow.
 *
 * Loaded only on demand (FoundSearchIsland decides from the session it already holds, with zero reads, whether there
 * is anything to do). Nothing here is ever awaited on a render path.
 *
 * 1. Start once: the SERVER starts the first round at sign-in (foundSearchAtSignIn.ts), so it never depends on the
 *    person staying on a page; a load that finds it still unstarted retries it here. Both run the one core
 *    (foundSearchStart.ts): the door's own first round (welcomeRound.ts) on the same stable subject, so the door
 *    later RESUMES it.
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
import { lookupSystemRun, startSystemRun } from "@/lib/workflows/system-runs";
import { addWitnesses } from "../found/foundCards";
import { mergeEvidence, type EvidenceItem } from "../evidence";
import { finishedRound, finishedRoundPath } from "../roundOutput";
import { mergeFacts, type BrandFact } from "../validate/queue";
import { visibleEvidence } from "../visibleEvidence";
import type { WeThinkSuggestion } from "../weThink";
import { loginSeed, type LoginSeed } from "./loginSeed";
import { welcomeNameOf } from "./welcomeName";
import { IDENTIFY_WORKFLOW_KEY, welcomeFirstRound } from "./welcomeRound";
import { MAX_WELCOME_ROUNDS, roundSubject, welcomeSubject } from "./welcomeSession";
import { welcomeFoundSomething, welcomeVerdict } from "./welcomeVerdict";
import { FOUND_WINDOW_LINK, foundSearchState, type FoundSearchState } from "./foundSearchState";
import { readWelcomeKnob } from "./welcomeKnobs";
import { foundStateMetadata, startFoundSearchWith, type FoundSearchInfo } from "./foundSearchStart";

// How often an open app checks a running round, and for how long after it started, are the `welcome.found_poll_ms`
// and `welcome.found_poll_for_ms` knobs (welcomeKnobs.ts).
const TERMINAL = ["completed", "failed", "errored", "cancelled", "stopped", "refused"];

export type { FoundSearchInfo } from "./foundSearchStart";

const dispatchOf = (): AppDispatch => {
  const store = getStoreSingleton();
  if (!store) throw new Error("The app store is not ready.");
  return store.dispatch as AppDispatch;
};

async function writeState(patch: Partial<FoundSearchState>): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: foundStateMetadata(patch) });
  if (error) throw new Error(`The found search could not save its progress: ${error.message}`);
}

async function freshUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`The found search could not read your account: ${error.message}`);
  return data.user ?? null;
}

const browserRules = () => fetchKnownDomainRules().catch(() => liveKnownDomainRules());

async function seedFor(user: User): Promise<LoginSeed> {
  return loginSeed(user, await browserRules());
}

/**
 * Start a round from the browser (the shared core, foundSearchStart.ts): a later round on new information, or the
 * retry when the sign-in's server start did not land.
 */
export async function startFoundSearch(info: FoundSearchInfo = {}, options: { asUnstarted?: boolean } = {}): Promise<void> {
  const dispatch = dispatchOf();
  await startFoundSearchWith(
    {
      freshUser,
      rules: browserRules,
      organizationId: () => ensureOrgId(null),
      writeState,
      runExists: async (subject, organizationId) =>
        Boolean(await lookupSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, subject, organizationId, "This session could not be read.")),
      startRun: ({ subject, organizationId, inputs }) =>
        startSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, { subject, organizationId, sourceFeature: "marketing", inputs }, "Identification could not start."),
    },
    info,
    options,
  );
}

/** Every round of the session that exists, in order (the door's and the background's alike; the first gap ends it). */
export async function sessionRounds(
  lookup: (subject: string) => Promise<{ runId: string; status: string } | null>,
  userId: string,
): Promise<{ runId: string; status: string }[]> {
  const out: { runId: string; status: string }[] = [];
  for (let n = 0; n < MAX_WELCOME_ROUNDS; n++) {
    const run = await lookup(roundSubject(welcomeSubject(userId), n));
    if (!run) break;
    out.push(run);
  }
  return out;
}

/** Everything the session's rounds found so far, as the door would show it, and whether to tell the person. */
async function verdictFor(user: User, runs: readonly { runId: string }[]) {
  const seed = await seedFor(user);
  const first = welcomeFirstRound(seed);
  let items = mergeEvidence(new Map<string, EvidenceItem>(), first?.items ?? []);
  let witnesses = addWitnesses(new Map(), []);
  let facts: BrandFact[] = [];
  let suggestions: Record<string, WeThinkSuggestion> = {};
  for (const run of runs) {
    // Only the slice the verdict reads (roundOutput.finishedRoundPath), never the whole stored output.
    const { data } = await getJson<{ output?: Record<string, unknown> | null }>(finishedRoundPath(run.runId));
    const r = finishedRound(data.output);
    items = mergeEvidence(items, r.evidence);
    witnesses = addWitnesses(witnesses, r.evidence);
    facts = mergeFacts(facts, r.facts);
    suggestions = { ...suggestions, ...r.suggestions };
  }
  const decisions = first?.decisions ?? {};
  const visible = visibleEvidence(items.values(), decisions, true, suggestions);
  const { name } = welcomeNameOf({ seed, visible });
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
  // EVERY round of the session counts, not only the one the account recorded (live 2026-10-21: a narrowed round the
  // door started found her and the check never read it).
  const runs = await sessionRounds(
    (subject) => lookupSystemRun(dispatch, IDENTIFY_WORKFLOW_KEY, subject, organizationId, "This session could not be read."),
    user.id,
  );
  // Started on record, but no run exists (a start that died after the state was written, or a run that was never made):
  // that is NOT "found nothing". Start it again (idempotent per subject) and keep watching; never settle it as empty.
  if (runs.length === 0) {
    await startFoundSearch({}, { asUnstarted: true });
    return "running";
  }
  if (runs.some((r) => !TERMINAL.includes(r.status))) return "running";
  const { verdict, seed } = await verdictFor(user, runs);
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
  const tick = async () => {
    if (stopped) return;
    const [pollMs, pollForMs] = await Promise.all([readWelcomeKnob("foundPollMs"), readWelcomeKnob("foundPollForMs")]);
    const until = (startedAt ? Date.parse(startedAt) : Date.now()) + pollForMs;
    if (stopped) return;
    try {
      const result = await checkFoundSearch();
      if (result !== "running" || Date.now() + pollMs > until) return;
    } catch (error) {
      console.error("[found-search] The check failed; the next load tries again.", error);
      return;
    }
    if (!stopped) timer = setTimeout(() => void tick(), pollMs);
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
