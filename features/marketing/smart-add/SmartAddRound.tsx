"use client";

/**
 * One evidence round = one run of the `smart_add_brand_identify` system
 * workflow. This adopts the run through the platform's Run Stream Adapter
 * (`useWorkflowRun`) and reports, as they arrive:
 *  - every evidence item (live `node_emitted` frames first, then each step's
 *    final output, so a lost frame never loses a finding);
 *  - each step's phase, progress line, notes and hard cost.
 * Renders nothing; the Smart Add screen owns the layout.
 */

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { readAiTestReplay, type AiTestReplay } from "@/features/ai-test-mode/replay";
import {
  selectNodeAggregate,
  selectRunEmissions,
  selectRunReadFailure,
  selectRunSpendUsd,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { evidenceFromPayload, type EvidenceItem } from "./evidence";
import { factsFromPayload, type BrandFact } from "./validate/queue";
import { brandNameFromPayload, factEvidence, webFirstData } from "./firstData";
import { suggestionsFromPayload, type WeThinkSuggestion } from "./weThink";
import { parseEntityKind, type EntityKind } from "./entityKind";
import { parseKeyPeople, type KeyPerson } from "./keyPeople";
import { parseEntryOutcome, type EntryOutcome } from "./entryOutcome";

/** The steps a Smart Add workflow shows, in order. */
export type SmartAddStepPair = readonly string[];
/** Identify: the raw tier (site, accounts, web) then the confirmed tiers (news/videos/images, local). */
export const IDENTIFY_STEPS: SmartAddStepPair = ["probe", "page", "avatars", "socials", "web", "deep", "local"];
export const SETUP_STEPS: SmartAddStepPair = ["logo", "accounts", "history"];
/** Steps whose output may carry the facts agent's `brand_basics` (read for facts only, not shown as steps). */
const FACT_STEPS: SmartAddStepPair = ["facts", "brand_basics", "person_facts", "whats_new_1", "whats_new_2", "whats_new_3"];
/** The person branch's anchor stage: its findings (read like any step's output, not shown as steps). */
const ANCHOR_STEPS: SmartAddStepPair = ["person_anchor_search", "person_anchor_extract"];
/** The web step's note when the page read found a parked domain after the search ran. */
export const PARKED_WEB_NOTE = "Parked domain — web results set aside";
/** The person / business verdict step (aidream brand.identify.person_signals). */
const SIGNALS_STEP = "person_signals";
/** The person-or-business decision step (mandate brand_intake.entity_kind_decision): runs only when the rules are unsure. */
const ENTITY_KIND_STEP = "entity_kind";
/** The key-people step (mandate brand_intake.key_people_finder): a business round's people, off the critical path. */
const KEY_PEOPLE_STEP = "key_people";
/** The first-data capture point: its `entry_outcome` says whether what was typed exists (aidream entry_outcome.py). */
const ENTRY_STEP = "first_point";
/** The path decision step (aidream brand.identify.path_decision; PATHS.md). */
const PATH_STEP = "path_decision";

/** One round's path, as sent back on the next round (`path_history`). */
export interface RoundPath {
  subject: string;
  path: string;
  runs_as: string;
  escalation: { from: string; to: string; reason: string } | null;
}

/** The round's person / business verdict (aidream services/brand_intake/person_signals.py). */
export interface PersonSignals {
  verdict: "person" | "business" | "ask" | "unknown";
  person_score: number;
  business_score: number;
  signals: { key: string; weight: number; source: string; value: string }[];
}

export function parsePersonSignals(raw: unknown): PersonSignals | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const verdict = r.verdict;
  if (verdict !== "person" && verdict !== "business" && verdict !== "ask" && verdict !== "unknown") return null;
  const signals = Array.isArray(r.signals)
    ? r.signals
        .map((x) => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => Boolean(x && typeof x.key === "string"))
        .map((x) => ({
          key: String(x.key),
          weight: typeof x.weight === "number" ? x.weight : 0,
          source: typeof x.source === "string" ? x.source : "",
          value: typeof x.value === "string" ? x.value : JSON.stringify(x.value ?? ""),
        }))
    : [];
  return {
    verdict,
    person_score: typeof r.person_score === "number" ? r.person_score : 0,
    business_score: typeof r.business_score === "number" ? r.business_score : 0,
    signals,
  };
}
/**
 * The "we think" step (mandate brand_intake.we_think): its `brand_we_think` suggestions, per finding key. Its guard
 * step (aidream brand.identify.we_think_guard: fixed facts correct the agent's pre-marks) comes after it, so its
 * answer wins wherever it arrived. `identity_marks` (aidream brand.identify.identity_marks) carries the is-this-us
 * decisions on the accounts the guard left as ask later, in the same `brand_we_think` shape, so it comes after the guard.
 */
const WE_THINK_STEPS: SmartAddStepPair = ["we_think", "we_think_guard", "identity_marks", "classify"];

/** The page step's gate detection (aidream brand_identify_gate.GateReport), as far as the screen uses it. */
export interface SiteGate {
  type: "division_chooser" | "language_gate" | "age_gate" | "splash" | "consent_wall" | "password" | "parked_domain";
  branches: { label: string; url: string }[];
}

function parseGate(raw: unknown): SiteGate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Record<string, unknown>;
  if (typeof g.type !== "string" || !Array.isArray(g.branches)) return null;
  const branches = g.branches
    .map((b) => (typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {}))
    .filter((b): b is { label: string; url: string } => typeof b.label === "string" && typeof b.url === "string")
    .map((b) => ({ label: b.label, url: b.url }));
  return { type: g.type as SiteGate["type"], branches };
}

/** The homepage pictured on a real browser (aidream brand.identify.screenshots): lasting CDN addresses. */
export interface BrandShot {
  file_id: string;
  url: string;
  width: number;
  height: number;
}
export interface BrandScreenshots {
  desktop: BrandShot | null;
  mobile: BrandShot | null;
  /** The page that was pictured (where the browser landed), so a site the person turned down drops its picture. */
  pageUrl: string | null;
}
const SCREENSHOTS_STEP = "screenshots";
/** A run in one of these has ended; nothing in it is still working, whatever a step last said. */
export const RUN_ENDED = ["completed", "failed", "errored", "cancelled", "stopped", "refused"];
const IN_FLIGHT = ["running", "retrying"];

function parseShot(raw: unknown): BrandShot | null {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!r || typeof r.url !== "string" || typeof r.file_id !== "string") return null;
  return { file_id: r.file_id, url: r.url, width: Number(r.width) || 0, height: Number(r.height) || 0 };
}

/** `{desktop, mobile}` from the step's output or its `brand_screenshots` frame; null until one picture exists. */
export function parseScreenshots(raw: unknown): BrandScreenshots | null {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!r) return null;
  const desktop = parseShot(r.desktop);
  const mobile = parseShot(r.mobile);
  return desktop || mobile ? { desktop, mobile, pageUrl: typeof r.page_url === "string" ? r.page_url : null } : null;
}

export interface StepView {
  gate?: SiteGate | null;
  step: string;
  phase: string;
  progress: string | null;
  notes: string[];
  costUsd: number;
  skipped: boolean;
  /** The step itself errored (its own error state), whatever the run's overall status says. */
  errored?: boolean;
  /** The server answered this step from a saved result (AI test mode); null for a real answer. */
  replay?: AiTestReplay | null;
}

export interface RoundView {
  runId: string;
  status: string | null;
  steps: StepView[];
  /** Everything this run spent so far (every paid step: anchors, lookups, searches, agents), USD. */
  spendUsd: number;
  /** Every watched step (agents included) the server answered from a saved result (AI test mode). */
  replays?: AiTestReplay[];
  /** Did what was typed exist? The first-data point's answer (aidream entry_outcome); null until it lands. */
  entry?: EntryOutcome | null;
  /** Why the run could not be READ (the attach refused), never the run's own failure. */
  readFailure?: string | null;
  /** The homepage picture is being taken right now (its own step runs in a live run), never "the round is busy". */
  shooting: boolean;
  /** A step that can bring a logo or photo (lookups, page reads, facts) is running right now in a live run. */
  imaging: boolean;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** One step of the run: its phase, progress, notes, cost, and the evidence in its final output. */
function StepWatch({
  runId,
  step,
  onStep,
}: {
  runId: string;
  step: string;
  onStep: (step: string, view: StepView, evidence: EvidenceItem[], facts: BrandFact[], suggestions: Record<string, WeThinkSuggestion>) => void;
}) {
  const aggregate = useAppSelector(selectNodeAggregate(runId, step));
  const invocation = aggregate.invocations[aggregate.invocations.length - 1] ?? null;
  const output = invocation?.output ?? null;
  const notes = Array.isArray(output?.notes) ? output.notes.filter((n): n is string => typeof n === "string") : [];
  const errorNote = invocation?.error?.message ? [invocation.error.message] : [];
  const view: StepView = {
    step,
    phase: aggregate.phase,
    progress: invocation?.progress?.message ?? null,
    notes: [...notes, ...errorNote],
    costUsd: numberOr(output?.cost_usd, 0),
    // A step the run skipped (its facts were not there yet) reads as skipped, like one with nothing to do.
    skipped: output?.skipped === true || aggregate.phase === "skipped",
    errored: aggregate.phase === "failed" || Boolean(invocation?.error),
    gate: parseGate(output?.gate),
    replay: readAiTestReplay(output),
  };
  const signature = JSON.stringify({
    view,
    evidence: evidenceFromPayload(output),
    facts: factsFromPayload(output),
    suggestions: suggestionsFromPayload(output),
  });
  useEffect(() => {
    const { view: v, evidence, facts, suggestions } = JSON.parse(signature) as {
      view: StepView;
      evidence: EvidenceItem[];
      facts: BrandFact[];
      suggestions: Record<string, WeThinkSuggestion>;
    };
    onStep(step, v, evidence, facts, suggestions);
  }, [signature, step, onStep]);
  return null;
}

export function SmartAddRound({
  runId,
  steps = IDENTIFY_STEPS,
  onEvidence,
  onFacts,
  onSuggestions,
  onSignals,
  onEntityKind,
  onKeyPeople,
  onPath,
  onScreenshots,
  onView,
}: {
  runId: string;
  steps?: SmartAddStepPair;
  onEvidence?: (items: EvidenceItem[]) => void;
  /** The facts agent's `brand_basics_fact` items, from live frames and step outputs. */
  onFacts?: (facts: BrandFact[]) => void;
  /** The we-think agent's suggestions, keyed by finding key (never an answer; the screen glows them). */
  onSuggestions?: (suggestions: Record<string, WeThinkSuggestion>) => void;
  /** The person / business verdict, once the person_signals step reports it. */
  onSignals?: (signals: PersonSignals) => void;
  /** The entity-kind decision's answer, once that step reports it (header label default). */
  onEntityKind?: (kind: EntityKind) => void;
  /** The key-people step's people, once that step reports them (the Key people section). */
  onKeyPeople?: (people: KeyPerson[]) => void;
  /** The round's path (aidream brand.identify.path_decision): {subject, path, runs_as}, for path_history. */
  onPath?: (decision: RoundPath) => void;
  /** The homepage pictured (aidream brand.identify.screenshots), desktop and mobile, once its frame lands. */
  onScreenshots?: (shots: BrandScreenshots) => void;
  onView: (view: RoundView) => void;
}) {
  useWorkflowRun(runId);
  const status = useAppSelector(selectRunStatus(runId));
  const emissions = useAppSelector(selectRunEmissions(runId));
  const [stepState, setStepState] = useState<
    Record<string, { view: StepView; evidence: EvidenceItem[]; facts: BrandFact[]; suggestions: Record<string, WeThinkSuggestion> }>
  >({});
  const onStep = (step: string, view: StepView, evidence: EvidenceItem[], facts: BrandFact[], suggestions: Record<string, WeThinkSuggestion>) =>
    setStepState((s) => ({ ...s, [step]: { view, evidence, facts, suggestions } }));

  // The web search starts with the quick check, never waiting on the whole-page read. When only the page read
  // (scraper fallback) finds the site is a parked / for-sale domain, the web results it already found are set
  // aside and the web step says so.
  const parkedLate = stepState.page?.view.gate?.type === "parked_domain";
  const keep = (e: EvidenceItem) => !(parkedLate && e.source?.node === "web");
  const live = emissions.flatMap((e) => evidenceFromPayload(e.payload));
  // First data (firstData.ts): the web step's own-site listing fills the name, logo and description rows the
  // moment it lands; the facts agent's findings merge into the same rows later (added or refined, never reset).
  const webAggregate = useAppSelector(selectNodeAggregate(runId, "web"));
  const webOut = webAggregate.invocations[webAggregate.invocations.length - 1]?.output ?? null;
  const factsAggregate = useAppSelector(selectNodeAggregate(runId, "facts"));
  const factsOut = factsAggregate.invocations[factsAggregate.invocations.length - 1]?.output ?? null;
  const facts = [
    ...emissions.flatMap((e) => factsFromPayload(e.payload)),
    ...[...steps, ...FACT_STEPS].flatMap((s) => stepState[s]?.facts ?? []),
  ];
  const all = [
    ...live,
    ...webFirstData(webOut),
    ...[...steps, ...ANCHOR_STEPS].flatMap((s) => stepState[s]?.evidence ?? []),
    ...factEvidence(facts, brandNameFromPayload(factsOut)),
  ].filter(keep);
  const signalsAggregate = useAppSelector(selectNodeAggregate(runId, SIGNALS_STEP));
  const signalsOut = signalsAggregate.invocations[signalsAggregate.invocations.length - 1]?.output ?? null;
  const signals =
    parsePersonSignals(signalsOut?.person_signals) ??
    emissions.map((e) => parsePersonSignals((e.payload as Record<string, unknown> | null)?.person_signals)).find(Boolean) ??
    null;
  const entityAggregate = useAppSelector(selectNodeAggregate(runId, ENTITY_KIND_STEP));
  const entityOut = entityAggregate.invocations[entityAggregate.invocations.length - 1]?.output ?? null;
  const entityKind = parseEntityKind(entityOut);
  useEffect(() => {
    if (entityKind) onEntityKind?.(entityKind);
  }, [entityKind, onEntityKind]);
  const peopleAggregate = useAppSelector(selectNodeAggregate(runId, KEY_PEOPLE_STEP));
  const keyPeople = parseKeyPeople(peopleAggregate.invocations[peopleAggregate.invocations.length - 1]?.output ?? null);
  const keyPeopleSig = keyPeople ? JSON.stringify(keyPeople) : "";
  // Keyed on the answer's content: a re-render with the same people never re-reports them.
  useEffect(() => {
    if (keyPeopleSig) onKeyPeople?.(JSON.parse(keyPeopleSig) as KeyPerson[]);
  }, [keyPeopleSig, onKeyPeople]);
  const pathAggregate = useAppSelector(selectNodeAggregate(runId, PATH_STEP));
  const pathOut = pathAggregate.invocations[pathAggregate.invocations.length - 1]?.output ?? null;
  const pathRec = (pathOut?.path_decision ??
    emissions.map((e) => (e.payload as Record<string, unknown> | null)?.path_decision).find(Boolean) ??
    null) as Record<string, unknown> | null;
  const pathKey =
    pathRec && typeof pathRec.path === "string"
      ? JSON.stringify({ subject: pathRec.subject, path: pathRec.path, runs_as: pathRec.runs_as, escalation: pathRec.escalation ?? null })
      : "";
  useEffect(() => {
    if (pathKey) onPath?.(JSON.parse(pathKey) as RoundPath);
  }, [pathKey, onPath]);
  const shotsAggregate = useAppSelector(selectNodeAggregate(runId, SCREENSHOTS_STEP));
  const shotsOut = shotsAggregate.invocations[shotsAggregate.invocations.length - 1]?.output ?? null;
  const shots =
    parseScreenshots(shotsOut) ??
    emissions.map((e) => parseScreenshots((e.payload as Record<string, unknown> | null)?.brand_screenshots)).find(Boolean) ??
    null;
  const shotsKey = shots ? JSON.stringify(shots) : "";
  useEffect(() => {
    if (shotsKey) onScreenshots?.(JSON.parse(shotsKey) as BrandScreenshots);
  }, [shotsKey, onScreenshots]);
  const signalsKey = signals ? JSON.stringify(signals) : "";
  useEffect(() => {
    if (signalsKey) onSignals?.(JSON.parse(signalsKey) as PersonSignals);
  }, [signalsKey, onSignals]);
  // Both callbacks are idempotent on unchanged content (the screen keeps its
  // state when nothing new arrived), so running on every render is safe.
  useEffect(() => {
    if (all.length) onEvidence?.(all);
  }, [all, onEvidence]);
  useEffect(() => {
    if (facts.length) onFacts?.(facts);
  }, [facts, onFacts]);
  const suggestions = Object.assign({}, ...WE_THINK_STEPS.map((s) => stepState[s]?.suggestions ?? {})) as Record<string, WeThinkSuggestion>;
  useEffect(() => {
    if (Object.keys(suggestions).length) onSuggestions?.(suggestions);
  }, [suggestions, onSuggestions]);

  const idle = (step: string): StepView => ({ step, phase: "idle", progress: null, notes: [], costUsd: 0, skipped: false });
  const spendUsd = useAppSelector(selectRunSpendUsd(runId));
  const stepView = (s: string): StepView => {
    const v = stepState[s]?.view ?? idle(s);
    return s === "web" && parkedLate && !v.skipped ? { ...v, notes: [...v.notes, PARKED_WEB_NOTE] } : v;
  };
  const replays = Object.values(stepState).flatMap((st) => (st.view.replay ? [st.view.replay] : []));
  // The round's entry answer: the first-data point carries it (a not-found entry skips the point and every agent).
  const entryAggregate = useAppSelector(selectNodeAggregate(runId, ENTRY_STEP));
  const entry = parseEntryOutcome(entryAggregate.invocations[entryAggregate.invocations.length - 1]?.output?.entry_outcome);
  const readFailure = useAppSelector(selectRunReadFailure(runId));
  // In flight = the step's own phase says running AND the run has not ended (an ended run never settles a step it
  // dropped). The screen's placeholders wait on these, never on the run as a whole.
  const runLive = status !== null && !RUN_ENDED.includes(status);
  const shooting = runLive && IN_FLIGHT.includes(shotsAggregate.phase);
  const imaging = runLive && [...steps, ...ANCHOR_STEPS, ...FACT_STEPS].some((s) => IN_FLIGHT.includes(stepState[s]?.view.phase ?? "idle"));
  const view: RoundView = {
    runId,
    status,
    steps: steps.map(stepView),
    spendUsd,
    shooting,
    imaging,
    ...(replays.length ? { replays } : {}),
    ...(entry ? { entry } : {}),
    ...(readFailure ? { readFailure } : {}),
  };
  useEffect(() => {
    onView(view);
  }, [view, onView]);

  return (
    <>
      {[...steps, ...(onEvidence ? ANCHOR_STEPS : []), ...(onFacts ? FACT_STEPS : []), ...(onSuggestions ? WE_THINK_STEPS : [])].map((s) => (
        <StepWatch key={s} runId={runId} step={s} onStep={onStep} />
      ))}
    </>
  );
}
