/**
 * Smart Add truth bench, "Real round" tab — pure logic (FEATURE.md beside this file).
 *
 * The person names a brand they know; ONE real Smart Add round runs (the system workflow
 * `smart_add_brand_identify`), and its three per-round judgments are captured with the exact
 * variables today's holder was given (stored on each holder conversation):
 *   identity_match_1..5 — "is this account ours?"          (brand_intake.identity_match_decision)
 *   entity_kind         — business, person or both          (brand_intake.entity_kind_decision)
 *   we_think            — what each open candidate is to us (brand_intake.we_think)
 * Each captured input is replayed through its Jev decision agent (one candidate per call), the
 * person marks the truth blind, and the scoreboard measures both systems against that truth only.
 */

import type { MatrixCell, MatrixSetup, MatrixVariant } from "../matrix/types";
import { BENCH_KEY } from "./model";

export const ROUND_KIND = "round" as const;
export const ROUND_WORKFLOW_KEY = "smart_add_brand_identify";
/** The we-think holder judges every open candidate in ONE call; identity runs one call per account. */
export const IDENTITY_STEPS = ["identity_match_1", "identity_match_2", "identity_match_3", "identity_match_4", "identity_match_5"];
export const ENTITY_STEP = "entity_kind";
export const WE_THINK_STEP = "we_think";
export const ROUND_STEPS = [...IDENTITY_STEPS, ENTITY_STEP, WE_THINK_STEP];

/** Jev's yes/no answers are read as P(yes); at or above YES_CUT is yes, at or below NO_CUT is no. */
export const YES_CUT = 0.65;
export const NO_CUT = 0.35;

export type Judgment = "identity" | "entity" | "we_think";
export type RoundSystem = "holder" | "jev";

export const JUDGMENTS: Judgment[] = ["identity", "entity", "we_think"];

export const JUDGMENT_LABEL: Record<Judgment, string> = {
  identity: "Is this account ours?",
  entity: "Business or person?",
  we_think: "We think",
};

export const ROUND_SYSTEM_LABEL: Record<RoundSystem, string> = { holder: "Today's AI", jev: "Jev" };

/** The decision question each Jev agent answers (the one a truth mark labels). */
export const JEV_QUESTION: Record<Judgment, string> = { identity: "is_this_us", entity: "entity_kind", we_think: "verdict" };
export const RELATION_QUESTION = "relation";

/** The tags that find each Jev agent (never ids in code). */
export const JEV_TAGS: Record<Judgment, string[]> = {
  identity: ["smart-add", "jev", "decision", "identity-match"],
  entity: ["smart-add", "jev", "decision", "entity-kind"],
  we_think: ["smart-add", "jev", "decision", "we-think"],
};

/** What the person can mark, per judgment (the value is also the label sent to Jev's answer). */
export const TRUTH_OPTIONS: Record<Judgment, { value: string; label: string }[]> = {
  identity: [
    { value: "ours", label: "Ours" },
    { value: "not_ours", label: "Not ours" },
  ],
  entity: [
    { value: "business", label: "Business" },
    { value: "person", label: "Person" },
    { value: "person_with_business", label: "Both" },
  ],
  we_think: [
    { value: "ours", label: "Ours" },
    { value: "not_us", label: "Not us" },
    { value: "related", label: "Related" },
    { value: "ask_later", label: "Ask later" },
  ],
};

/** A system's answer, normalized to the truth's own values; `cant_tell` when it did not commit. */
export interface RoundAnswer {
  value: string;
  /** Its own words (relation key, raw choice). */
  detail: string | null;
  /** Identity: P(yes). Otherwise the system's probability for its answer. */
  probability: number | null;
}

export const CANT_TELL = "cant_tell";

export interface HolderCall {
  step: string;
  judgment: Judgment;
  status: "completed" | "failed" | "running";
  conversationId: string | null;
  durationMs: number | null;
  cost: number;
  error: string | null;
}

export interface RoundItem {
  /** `identity:<step>` | `entity` | `we:<candidate key>` — also the matrix row id. */
  id: string;
  judgment: Judgment;
  /** What the person reads to mark it (never any system's answer). */
  title: string;
  url: string | null;
  detail: string;
  /** The variables Jev is given — today's holder's own, verbatim (we think: one candidate). */
  variables: Record<string, string>;
  /** The holder step that judged it. */
  step: string;
  holder: RoundAnswer | null;
}

export interface RoundTruth {
  value: string;
  /** Identity, when not ours: how it relates (Jev's relation keys). */
  relation?: string | null;
}

export interface RoundBrand {
  website: string;
  name: string;
  place: string;
  /** Accounts the person knows are theirs, one per line or comma separated. */
  accounts: string;
  entryKind: "company" | "person";
}

export interface RoundBench {
  kind: typeof ROUND_KIND;
  brand: RoundBrand;
  runId: string | null;
  /** The Jev agent per judgment, found by tags at start. */
  agents: Record<Judgment, string | null>;
  /** Jev's relation keys (identity), read from its decision question at start. */
  relationOptions: string[];
  /** Filled once the round finishes. */
  captured: boolean;
  runStatus: string | null;
  holderCalls: HolderCall[];
  /** Judgment steps that ran but whose inputs could not be read (no conversation or variables). */
  unreadable: string[];
  items: RoundItem[];
  truth: Record<string, RoundTruth>;
  ranAt: string | null;
}

export function emptyRoundBench(): RoundBench {
  return {
    kind: ROUND_KIND,
    brand: { website: "", name: "", place: "", accounts: "", entryKind: "company" },
    runId: null,
    agents: { identity: null, entity: null, we_think: null },
    relationOptions: [],
    captured: false,
    runStatus: null,
    holderCalls: [],
    unreadable: [],
    items: [],
    truth: {},
    ranAt: null,
  };
}

export function readRoundBench(metadata: Record<string, unknown> | null | undefined): RoundBench | null {
  const raw = metadata?.[BENCH_KEY];
  if (!raw || typeof raw !== "object" || (raw as { kind?: unknown }).kind !== ROUND_KIND) return null;
  return { ...emptyRoundBench(), ...(raw as Partial<RoundBench>) };
}

export function isRoundMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  const raw = metadata?.[BENCH_KEY];
  return Boolean(raw && typeof raw === "object" && (raw as { kind?: unknown }).kind === ROUND_KIND);
}

// ---------------------------------------------------------------------------
// The round's inputs — the shape Smart Add itself sends (features/marketing/smart-add)
// ---------------------------------------------------------------------------

export function hostOf(website: string): string {
  const raw = website.trim();
  if (!raw) return "";
  try {
    return new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

function accountList(brand: RoundBrand): string[] {
  return [...new Set(brand.accounts.split(/\n|,/).map((s) => s.trim()).filter(Boolean))];
}

function handleOf(account: string): string {
  const tail = account.replace(/\/+$/, "").split("/").pop() ?? "";
  return tail.replace(/^@/, "").trim();
}

/**
 * The round's workflow inputs: what the person typed, confirmed as known (a round after the person
 * confirmed their own name, site and accounts — the round that runs every judgment).
 */
export function roundInputs(brand: RoundBrand): Record<string, unknown> {
  const domain = hostOf(brand.website);
  const accounts = accountList(brand);
  const website = brand.website.trim() ? (/^[a-z]+:\/\//i.test(brand.website.trim()) ? brand.website.trim() : `https://${brand.website.trim()}`) : "";
  const handles = [...new Set(accounts.map(handleOf).filter(Boolean))];
  const links = [...accounts, ...(website ? [website] : [])];
  const confirmed = {
    ...(brand.name.trim() ? { name: brand.name.trim() } : {}),
    ...(domain ? { domain } : {}),
    ...(brand.place.trim() ? { location: brand.place.trim() } : {}),
    ...(handles.length ? { handles } : {}),
    ...(links.length ? { links } : {}),
  };
  const woken = {
    ...(brand.name.trim() ? { name: brand.name.trim() } : {}),
    ...(brand.place.trim() ? { location: brand.place.trim() } : {}),
  };
  return {
    website,
    socials: accounts.map((a) => ({ handle_or_url: a })),
    confirmed,
    woken,
    exclude_keys: [],
    entry_kind: brand.entryKind,
    known: {
      websites: domain ? [domain] : [],
      accounts,
      names: brand.name.trim() ? [brand.name.trim()] : [],
      aliases: [],
      exclusions: [],
      results: [],
    },
    first_data: true,
  };
}

// ---------------------------------------------------------------------------
// Reading the holder's answers (today's mandate holders answer in text JSON or a kind)
// ---------------------------------------------------------------------------

export function parseJsonText(text: string | null | undefined): unknown {
  if (!text) return null;
  const body = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A holder step's output content → its answer object (a kind block, or JSON in a text block). */
export function holderPayload(content: unknown): Obj | null {
  const blocks = Array.isArray(content) ? content : [content];
  for (const b of blocks) {
    const o = asObj(b);
    if (o.__kind && o.__kind !== "markdown" && o.__kind !== "text") return o;
  }
  for (const b of blocks) {
    const o = asObj(b);
    const parsed = parseJsonText(typeof o.text === "string" ? o.text : typeof b === "string" ? b : null);
    if (parsed && typeof parsed === "object") return parsed as Obj;
  }
  return null;
}

export function holderIdentity(payload: Obj | null): RoundAnswer | null {
  if (!payload) return null;
  const q = asObj(payload.is_this_us);
  const a = q.answer;
  const relation = asObj(payload.relation).answer;
  const yes = a === true || a === "yes" || a === "true";
  const no = a === false || a === "no" || a === "false";
  return {
    value: yes ? "ours" : no ? "not_ours" : CANT_TELL,
    detail: typeof relation === "string" ? relation : typeof a === "string" ? a : null,
    probability: num(q.probability),
  };
}

const ENTITY_VALUES = new Set(["business", "person", "person_with_business"]);

export function holderEntity(payload: Obj | null): RoundAnswer | null {
  if (!payload) return null;
  const k = String(payload.entity_kind ?? "");
  return { value: ENTITY_VALUES.has(k) ? k : CANT_TELL, detail: k || null, probability: num(payload.probability) };
}

/** We think choices → the truth's values: a name's preferred / alias and an account's ours are all "ours". */
export function weThinkValue(choice: string): string {
  if (choice === "ours" || choice === "preferred" || choice === "alias") return "ours";
  if (choice === "not_us" || choice === "related" || choice === "ask_later") return choice;
  return CANT_TELL;
}

export function holderWeThink(payload: Obj | null): Map<string, RoundAnswer> {
  const out = new Map<string, RoundAnswer>();
  const list = Array.isArray(payload?.suggestions) ? (payload.suggestions as unknown[]) : [];
  for (const s of list) {
    const o = asObj(s);
    if (typeof o.key !== "string") continue;
    const choice = String(o.choice ?? "");
    const rel = typeof o.relation_key === "string" ? o.relation_key : null;
    out.set(o.key, { value: weThinkValue(choice), detail: [choice, rel].filter(Boolean).join(" · ") || null, probability: num(o.probability) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Capturing the round
// ---------------------------------------------------------------------------

/** One recorded workflow event, as read from `workflow.node_events`. */
export interface RoundEvent {
  node_id: string | null;
  event_type: string;
  duration_ms: number | null;
  error_message: string | null;
  conversation_id: string | null;
  failed_conversation_id: string | null;
  cost_usd: number | null;
  content: unknown;
}

export function judgmentOfStep(step: string): Judgment | null {
  if (IDENTITY_STEPS.includes(step)) return "identity";
  if (step === ENTITY_STEP) return "entity";
  if (step === WE_THINK_STEP) return "we_think";
  return null;
}

export interface StepRead {
  call: HolderCall;
  content: unknown;
}

/** The round's judgment steps from its events: status, conversation, time, cost and output. */
export function readSteps(events: RoundEvent[]): StepRead[] {
  const by = new Map<string, StepRead>();
  for (const e of events) {
    const step = e.node_id ?? "";
    const judgment = judgmentOfStep(step);
    if (!judgment) continue;
    const s = by.get(step) ?? {
      call: { step, judgment, status: "running", conversationId: null, durationMs: null, cost: 0, error: null },
      content: null,
    };
    if (e.event_type === "node_completed") {
      s.call.status = "completed";
      s.call.error = null; // a retried step that then finished
      s.call.durationMs = e.duration_ms ?? s.call.durationMs;
      s.content = e.content;
    } else if (e.event_type === "node_failed") {
      s.call.status = "failed";
      s.call.error = e.error_message ?? "The step failed.";
      s.call.conversationId = s.call.conversationId ?? e.failed_conversation_id;
      s.call.durationMs = e.duration_ms ?? s.call.durationMs;
    } else if (e.event_type === "node_cost") {
      s.call.conversationId = e.conversation_id ?? s.call.conversationId;
      s.call.cost += e.cost_usd ?? 0;
    }
    by.set(step, s);
  }
  return ROUND_STEPS.filter((st) => by.has(st)).map((st) => by.get(st) as StepRead);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
}

/** The text after a "Label:\n" line inside the holder's rendered candidate block. */
function fieldIn(text: string, label: string): string {
  const m = text.match(new RegExp(`${label}:\\n([^\\n]*)`, "i"));
  return m?.[1]?.trim() ?? "";
}

/** The same brand context the Jev we-think agent was built to read (its holder's three facts). */
export function weThinkBrandContext(vars: Record<string, unknown>): string {
  return [
    `What we know so far:\n${str(vars.known_facts) || "[NONE]"}`,
    `What's confirmed as ours:\n${str(vars.confirmed_identity) || "[NONE]"}`,
    `What I've said is NOT us:\n${str(vars.exclusions) || "[NONE]"}`,
  ].join("\n\n");
}

/** Only the variables an agent declares, as strings. */
function onlyVars(vars: Record<string, unknown>, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, str(vars[n])]));
}

export const JEV_VARIABLES: Record<Judgment, string[]> = {
  identity: ["candidate", "known_brand", "rules_read"],
  entity: ["known_facts", "profiles", "rules_read", "site_identity", "started_as", "what_was_typed"],
  we_think: ["brand_context", "item"],
};

/** Steps that ran but whose holder inputs cannot be read — named on the page, never dropped silently. */
export function unreadableSteps(steps: StepRead[], variablesByConversation: Map<string, Record<string, unknown>>): string[] {
  return steps
    .filter((s) => !s.call.conversationId || !variablesByConversation.has(s.call.conversationId))
    .map((s) => s.call.step);
}

/**
 * Every item to judge, from the round's steps and each holder conversation's variables.
 * `variablesByConversation`: chat.conversation.variables of each holder step.
 */
export function buildItems(
  steps: StepRead[],
  variablesByConversation: Map<string, Record<string, unknown>>,
  brand: RoundBrand,
): RoundItem[] {
  const items: RoundItem[] = [];
  for (const { call, content } of steps) {
    const vars = call.conversationId ? variablesByConversation.get(call.conversationId) : undefined;
    if (!vars) continue;
    const payload = call.status === "completed" ? holderPayload(content) : null;
    if (call.judgment === "identity") {
      const candidate = str(vars.candidate);
      const address = fieldIn(candidate, "Address");
      items.push({
        id: `identity:${call.step}`,
        judgment: "identity",
        title: fieldIn(candidate, "Name the search result shows") || fieldIn(candidate, "Handle") || address || "Account",
        url: /^https?:\/\//i.test(address) ? address : null,
        detail: candidate,
        variables: onlyVars(vars, JEV_VARIABLES.identity),
        step: call.step,
        holder: holderIdentity(payload),
      });
    } else if (call.judgment === "entity") {
      items.push({
        id: "entity",
        judgment: "entity",
        title: brand.name || hostOf(brand.website) || "This brand",
        url: brand.website.trim() ? (/^https?:\/\//i.test(brand.website) ? brand.website.trim() : `https://${brand.website.trim()}`) : null,
        detail: str(vars.known_facts),
        variables: onlyVars(vars, JEV_VARIABLES.entity),
        step: call.step,
        holder: holderEntity(payload),
      });
    } else {
      const parsed = asObj(typeof vars.candidates === "string" ? parseJsonText(vars.candidates) : vars.candidates);
      const list = Array.isArray(parsed.items) ? (parsed.items as unknown[]) : [];
      const answers = holderWeThink(payload);
      const context = weThinkBrandContext(vars);
      for (const c of list) {
        const o = asObj(c);
        const key = typeof o.key === "string" ? o.key : "";
        if (!key) continue;
        const url = typeof o.url === "string" ? o.url : null;
        items.push({
          id: `we:${key}`,
          judgment: "we_think",
          title: str(o.display_name) || str(o.value) || key,
          url: url && /^https?:\/\//i.test(url) ? url : null,
          detail: [o.type, o.platform, o.snippet, o.found_where].map(str).filter(Boolean).join(" · "),
          variables: { brand_context: context, item: JSON.stringify(o) },
          step: call.step,
          // A completed holder call that skipped this candidate gave no answer for it.
          holder: answers.get(key) ?? null,
        });
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Jev — the matrix (one row per item, the row carries its Jev agent) and its answers
// ---------------------------------------------------------------------------

export const JEV_COLUMN = "jev";

export function buildRoundSetup(bench: RoundBench): MatrixSetup {
  const rows: MatrixVariant[] = bench.items
    .filter((i) => bench.agents[i.judgment])
    .map((i) => ({
      id: i.id,
      label: `${JUDGMENT_LABEL[i.judgment]} · ${i.title}`.slice(0, 120),
      patch: { agent_id: bench.agents[i.judgment] as string, variables: i.variables },
    }));
  return {
    schema_version: 1,
    base: {},
    rows: { label: "Items", variants: rows },
    columns: { label: "Systems", variants: [{ id: JEV_COLUMN, label: ROUND_SYSTEM_LABEL.jev, patch: {} }] },
    repeats: 1,
  };
}

export function roundCellsToRun(setup: MatrixSetup): { row_id: string; column_id: string; repeat: number }[] {
  return setup.rows.variants.map((r) => ({ row_id: r.id, column_id: JEV_COLUMN, repeat: 0 }));
}

/** One decision answer, whichever reader it came from. */
export interface DecisionRead {
  answer: string;
  /** For a yes/no question: P(yes). */
  probability: number | null;
  /** P(the given answer). */
  pAnswer: number | null;
}

export type DecisionAnswers = Record<string, DecisionRead>;

function answerText(a: unknown): string {
  if (a === true) return "true";
  if (a === false) return "false";
  return typeof a === "string" ? a : a == null ? "" : String(a);
}

/** A matrix cell's answer text (a `decision_answers` part as JSON, server fix 53b9785ceb). */
export function readDecisionCell(answer: string | null | undefined): DecisionAnswers | null {
  const parsed = asObj(parseJsonText(answer));
  const answers = asObj(parsed.answers);
  if (!Object.keys(answers).length) return null;
  const out: DecisionAnswers = {};
  for (const [q, raw] of Object.entries(answers)) {
    const o = asObj(raw);
    const a = answerText(o.answer);
    const probs = asObj(o.probabilities);
    out[q] = {
      answer: a,
      probability: num(o.probability),
      pAnswer: num(o.p_answer) ?? num(probs[a]),
    };
  }
  return out;
}

/** P(yes) of a yes/no answer: its probability; else from the answer and P(answer). */
export function pYes(d: DecisionRead): number | null {
  if (d.probability != null) return d.probability;
  if (d.pAnswer == null) return null;
  if (d.answer === "true" || d.answer === "yes") return d.pAnswer;
  if (d.answer === "false" || d.answer === "no") return 1 - d.pAnswer;
  return null;
}

/** Jev's decision answers → the item's normalized answer. */
export function jevAnswer(judgment: Judgment, answers: DecisionAnswers | null): RoundAnswer | null {
  if (!answers) return null;
  const d = answers[JEV_QUESTION[judgment]];
  if (!d) return null;
  if (judgment === "identity") {
    const p = pYes(d);
    const relation = answers[RELATION_QUESTION]?.answer ?? null;
    const value = p == null ? CANT_TELL : p >= YES_CUT ? "ours" : p <= NO_CUT ? "not_ours" : CANT_TELL;
    return { value, detail: relation, probability: p };
  }
  if (judgment === "entity") {
    return { value: ENTITY_VALUES.has(d.answer) ? d.answer : CANT_TELL, detail: d.answer || null, probability: d.pAnswer };
  }
  return { value: weThinkValue(d.answer), detail: d.answer || null, probability: d.pAnswer };
}

export interface JevRun {
  answers: Map<string, RoundAnswer>;
  conversations: Map<string, string>;
  durations: Map<string, number>;
  costs: Map<string, number>;
  status: Map<string, MatrixCell["status"]>;
}

/** Jev's cells → answers per item. `store`: decision answers read by conversation for cells without answer text. */
export function readJevRun(cells: MatrixCell[], items: RoundItem[], store: Map<string, DecisionAnswers> = new Map()): JevRun {
  const judgmentOf = new Map(items.map((i) => [i.id, i.judgment]));
  const run: JevRun = { answers: new Map(), conversations: new Map(), durations: new Map(), costs: new Map(), status: new Map() };
  for (const cell of cells) {
    const judgment = judgmentOf.get(cell.rowId);
    if (!judgment || cell.columnId !== JEV_COLUMN) continue;
    run.status.set(cell.rowId, cell.status);
    if (cell.conversationId) run.conversations.set(cell.rowId, cell.conversationId);
    if (cell.status !== "completed" || !cell.result) continue;
    if (typeof cell.result.duration_ms === "number") run.durations.set(cell.rowId, cell.result.duration_ms);
    if (typeof cell.result.cost === "number") run.costs.set(cell.rowId, cell.result.cost);
    const a = jevAnswer(judgment, readDecisionCell(cell.result.answer) ?? store.get(cell.conversationId) ?? null);
    if (a) run.answers.set(cell.rowId, a);
  }
  return run;
}

// ---------------------------------------------------------------------------
// The scoreboard — per judgment, against the person's truth only
// ---------------------------------------------------------------------------

/** The two costly misses each judgment counts. */
export const COSTLY: Record<Judgment, [string, string]> = {
  identity: ["Stranger called ours", "Ours called stranger"],
  entity: ["Person called business", "Business called person"],
  we_think: ["Stranger called ours", "Ours called not us"],
};

/** Which costly miss (0 / 1) a wrong answer is, or null. */
export function costlyMiss(judgment: Judgment, said: string, truth: string): 0 | 1 | null {
  if (judgment === "identity") return said === "ours" && truth === "not_ours" ? 0 : said === "not_ours" && truth === "ours" ? 1 : null;
  if (judgment === "entity") {
    const personTruth = truth === "person" || truth === "person_with_business";
    if (said === "business" && personTruth) return 0;
    if ((said === "person" || said === "person_with_business") && truth === "business") return 1;
    return null;
  }
  if (said === "ours" && (truth === "not_us" || truth === "related")) return 0;
  if (said === "not_us" && truth === "ours") return 1;
  return null;
}

export interface RoundScore {
  marked: number;
  right: number;
  wrong: number;
  cantTell: number;
  missing: number;
  costly: [number, number];
  p50: number | null;
  p90: number | null;
  cost: number;
  calls: number;
}

function pct(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

export function isRight(said: RoundAnswer | null | undefined, truth: RoundTruth): boolean {
  return Boolean(said && said.value === truth.value);
}

/**
 * One system on one judgment. An answer equal to the truth is right (so "ask later" is right when
 * the person also marked ask later); a non-committal answer — can't tell, or ask later against any
 * other truth — is its own column, never a wrong.
 */
export function scoreRound(
  judgment: Judgment,
  items: RoundItem[],
  truth: Record<string, RoundTruth>,
  answerOf: (item: RoundItem) => RoundAnswer | null | undefined,
  calls: { durationMs: number | null; cost: number }[],
): RoundScore {
  const out: RoundScore = {
    marked: 0, right: 0, wrong: 0, cantTell: 0, missing: 0, costly: [0, 0],
    p50: null, p90: null, cost: 0, calls: calls.length,
  };
  const durations = calls.map((c) => c.durationMs).filter((d): d is number => typeof d === "number");
  out.p50 = pct(durations, 0.5);
  out.p90 = pct(durations, 0.9);
  out.cost = calls.reduce((s, c) => s + c.cost, 0);
  for (const item of items) {
    if (item.judgment !== judgment) continue;
    const t = truth[item.id];
    if (!t) continue;
    out.marked += 1;
    const a = answerOf(item);
    if (!a) out.missing += 1;
    else if (a.value === t.value) out.right += 1;
    else if (a.value === CANT_TELL || a.value === "ask_later") out.cantTell += 1;
    else {
      out.wrong += 1;
      const c = costlyMiss(judgment, a.value, t.value);
      if (c !== null) out.costly[c] += 1;
    }
  }
  return out;
}

/** The holder's calls for one judgment (we think: one call covers every candidate). */
export function holderCallsFor(bench: RoundBench, judgment: Judgment): HolderCall[] {
  return bench.holderCalls.filter((c) => c.judgment === judgment && c.status !== "running");
}

/** Jev's calls for one judgment, one per item that ran. */
export function jevCallsFor(run: JevRun, items: RoundItem[], judgment: Judgment): { durationMs: number | null; cost: number }[] {
  return items
    .filter((i) => i.judgment === judgment && run.status.get(i.id) === "completed")
    .map((i) => ({ durationMs: run.durations.get(i.id) ?? null, cost: run.costs.get(i.id) ?? 0 }));
}

/** The answer shown/labelled for a truth mark on Jev's run: the label each question takes. */
export function jevLabel(judgment: Judgment, truth: RoundTruth): { question: string; answer: string }[] {
  if (judgment === "identity") {
    const out = [{ question: JEV_QUESTION.identity, answer: truth.value === "ours" ? "true" : "false" }];
    if (truth.value === "not_ours" && truth.relation) out.push({ question: RELATION_QUESTION, answer: truth.relation });
    return out;
  }
  return [{ question: JEV_QUESTION[judgment], answer: truth.value }];
}

/** Every option key of a named decision question in an agent's messages (its `decision_questions` part). */
export function questionOptions(messages: unknown, question: string): string[] {
  const list = Array.isArray(messages) ? messages : [];
  for (const m of list) {
    const content = asObj(m).content;
    for (const part of Array.isArray(content) ? content : []) {
      const p = asObj(part);
      if (p.type !== "decision_questions" && p.__kind !== "decision_questions") continue;
      for (const q of Array.isArray(p.questions) ? p.questions : []) {
        const qo = asObj(q);
        if (qo.name !== question) continue;
        if (Array.isArray(qo.options)) return qo.options.map((o) => (typeof o === "string" ? o : String(asObj(o).key ?? ""))).filter(Boolean);
        return Object.keys(asObj(qo.criteria));
      }
    }
  }
  return [];
}
