/**
 * Decision review — the reference check, pure half.
 *
 * A reference run asks a second, stronger model (the reference) the SAME
 * question on the SAME judged state as a saved decision answer, and records
 * one `platform.judge_verdict` row per checked item, written by
 * `platform.record_decision_reference`: `subject_kind = 'decision_reference'`,
 * `subject_ref_id` = the decision item's id, `judge_key =
 * 'reference:model:<name>'`, `verdict` = the reference's answer in the ITEM's
 * label vocabulary, metadata `{answer, p_answer, probability, probabilities,
 * legend, agree, agent_id, run_id, reference_model, cost_usd, latency_ms,
 * item_*}`. Server contract: aidream `aidream/services/decision_review/reference.py`
 * (`POST /decision-review/agents/{id}/reference-runs`; the stream's events are
 * typed `data` payloads, `decision_reference_*`).
 *
 * Reference agreement is a SECOND opinion from an AI, never a label: it is
 * shown beside the human labels, never merged into them.
 */

import { isJsonObject } from "@/types/json";
import {
  answerProbability,
  formatAnswerHeadline,
  readDecisionAnswers,
  type DecisionAnswersView,
} from "@ai-matrx/agents/presentation/decision-answers";
import type { ReviewItem } from "./queue";
import type { CurveBin } from "./components/ReliabilityCurve";

export const REFERENCE_SUBJECT_KIND = "decision_reference" as const;

/** How many items one run checks unless the person picks otherwise. */
export const REFERENCE_DEFAULT_COUNT = 10;
/** Used only until the server's quote names its own ceiling. */
export const REFERENCE_FALLBACK_MAX = 20;

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

// ── One reference verdict ────────────────────────────────────────────────────

export interface ReferenceVerdict {
  /** The reference row's own id (live stream rows have none until reloaded). */
  id: string | null;
  itemId: string;
  runId: string | null;
  referenceModel: string | null;
  /** The reference's answer in label vocabulary (noul true|false, choice key, score level). */
  answer: string | null;
  /** Probability the reference gave its own answer. */
  pAnswer: number | null;
  agree: boolean | null;
  costUsd: number | null;
  latencyMs: number | null;
  createdAt: string | null;
  /** Yes/No only: P(true), as the reference stated it. */
  probability: number | null;
  /** Raw distribution, as the server returned it. */
  probabilities: unknown;
  rawAnswer: unknown;
}

export interface ReferenceVerdictRow {
  id: string;
  subject_ref_id: string | null;
  verdict: string | null;
  confidence: number | null;
  model: string | null;
  created_at: string;
  metadata: unknown;
}

function modelName(value: unknown): string | null {
  if (isJsonObject(value)) return str(value.name) ?? str(value.id);
  return str(value);
}

/** The answer in label vocabulary: a boolean reads as "true"/"false", anything else verbatim. */
export function answerKey(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return str(value);
}

export function readReferenceVerdictRow(row: ReferenceVerdictRow): ReferenceVerdict | null {
  if (!row.subject_ref_id) return null;
  const meta: Record<string, unknown> = isJsonObject(row.metadata) ? row.metadata : {};
  return {
    id: row.id,
    itemId: row.subject_ref_id,
    runId: str(meta.run_id),
    referenceModel: modelName(meta.reference_model) ?? row.model,
    answer: str(row.verdict) ?? answerKey(meta.answer),
    pAnswer: num(meta.p_answer) ?? num(row.confidence),
    agree: bool(meta.agree),
    costUsd: num(meta.cost_usd),
    latencyMs: num(meta.latency_ms),
    createdAt: row.created_at,
    probability: num(meta.probability),
    probabilities: meta.probabilities ?? null,
    rawAnswer: meta.answer ?? row.verdict,
  };
}

/** Newest verdict per item — a re-checked item shows its latest run. */
export function latestPerItem(verdicts: ReferenceVerdict[]): Map<string, ReferenceVerdict> {
  const latest = new Map<string, ReferenceVerdict>();
  for (const v of verdicts) {
    const current = latest.get(v.itemId);
    if (!current || (v.createdAt ?? "") > (current.createdAt ?? "")) latest.set(v.itemId, v);
  }
  return latest;
}

// ── The reference answer, read by the ONE answers reader ─────────────────────

/**
 * The reference's answer as a `DecisionAnswersView` of the item's question, so
 * it is shown by the same reader and card as the decision model's answer.
 * A Yes/No with no distribution is rebuilt from `p_answer` (P(answer) → P(true)).
 */
export function referenceView(item: ReviewItem, ref: ReferenceVerdict): DecisionAnswersView | null {
  const source = item.view?.answers[0];
  let probability: number | null = null;
  if (item.answerType === "noul") {
    const dist = isJsonObject(ref.probabilities) ? ref.probabilities : null;
    probability = ref.probability ?? num(dist?.true) ?? num(dist?.yes) ?? null;
    if (probability == null && ref.pAnswer != null && ref.answer != null) {
      probability = ref.answer === "true" ? ref.pAnswer : 1 - ref.pAnswer;
    }
  }
  return readDecisionAnswers({
    model: ref.referenceModel,
    method: null,
    answers: {
      [item.question]: {
        type: item.answerType === "unknown" ? null : item.answerType,
        answer: item.answerType === "noul" ? ref.answer === "true" : (ref.rawAnswer ?? ref.answer),
        probability,
        probabilities: item.answerType === "noul" ? null : ref.probabilities,
        legend: source?.legend ?? null,
        confidence: null,
        instructions: item.instructions,
      },
    },
  });
}

/** "No 71%": the answer and the probability OF THAT ANSWER (never P(true) of a No). */
export function answerWithPercent(view: DecisionAnswersView | null, fallbackP: number | null): string {
  const answer = view?.answers[0];
  if (!answer) return "—";
  const headline = formatAnswerHeadline(answer);
  const p = answerProbability(answer) ?? fallbackP;
  return p == null ? headline : `${headline} ${Math.round(p * 100)}%`;
}

// ── The results table ────────────────────────────────────────────────────────

export interface ReferenceFailure {
  itemId: string;
  question: string | null;
  error: string;
}

export interface ReferenceResultRow {
  id: string;
  item: ReviewItem;
  reference: ReferenceVerdict | null;
  failure: ReferenceFailure | null;
  /** In the current run and not answered yet. */
  pending: boolean;
  /** First line of the judged user turn, when readable. */
  snippet: string | null;
}

/** Did the reference agree? A stored `agree` wins; else compare the two answers. */
export function rowAgrees(row: Pick<ReferenceResultRow, "item" | "reference">): boolean | null {
  const ref = row.reference;
  if (!ref) return null;
  if (ref.agree != null) return ref.agree;
  if (ref.answer == null) return null;
  return ref.answer === row.item.verdict;
}

function rank(row: ReferenceResultRow): number {
  const agrees = rowAgrees(row);
  if (agrees === false) return 0;
  if (row.failure) return 1;
  if (row.pending || agrees == null) return 2;
  return 3;
}

/**
 * Disagreements first, then failures, then unanswered, then agreements; inside
 * each, the decision model's lowest confidence first (no confidence leads).
 */
export function compareReferenceRows(a: ReferenceResultRow, b: ReferenceResultRow): number {
  const r = rank(a) - rank(b);
  if (r !== 0) return r;
  const ca = a.item.confidence ?? a.item.pAnswer ?? -1;
  const cb = b.item.confidence ?? b.item.pAnswer ?? -1;
  if (ca !== cb) return ca - cb;
  return b.item.createdAt.localeCompare(a.item.createdAt);
}

export function orderReferenceRows(rows: ReferenceResultRow[]): ReferenceResultRow[] {
  return [...rows].sort(compareReferenceRows);
}

/** The first non-empty line of the judged state, cut for a table cell. */
export function firstLine(parts: string[], max = 120): string | null {
  for (const part of parts) {
    const line = part.split("\n").map((l) => l.trim()).find(Boolean);
    if (line) return line.length > max ? `${line.slice(0, max - 1)}…` : line;
  }
  return null;
}

// ── Money ────────────────────────────────────────────────────────────────────

/** "$0.12", "$0.0042", "<$0.0001"; null reads as "—". */
export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.0001) return "<$0.0001";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

// ── The quote ────────────────────────────────────────────────────────────────

export interface ReferenceQuote {
  itemCount: number;
  referenceModel: { id: string | null; name: string };
  estimatedCostUsd: number | null;
  items: Array<{ itemId: string; question: string | null }>;
  /** Chosen answers left out because this reference model already answered them. */
  skippedExisting: number;
  /** The server's ceiling for one run, when it names one. */
  maxItems: number | null;
}

export function readReferenceQuote(value: unknown): ReferenceQuote {
  if (!isJsonObject(value)) throw new Error("The estimate came back in an unexpected shape.");
  const items = Array.isArray(value.items)
    ? value.items.flatMap((entry) => {
        if (!isJsonObject(entry)) return [];
        const itemId = str(entry.item_id);
        return itemId ? [{ itemId, question: str(entry.question) }] : [];
      })
    : [];
  const model = value.reference_model;
  return {
    itemCount: num(value.item_count) ?? items.length,
    referenceModel: {
      id: isJsonObject(model) ? str(model.id) : null,
      name: modelName(model) ?? "Reference model",
    },
    estimatedCostUsd: num(value.estimated_cost_usd),
    items,
    skippedExisting: num(value.skipped_existing) ?? 0,
    maxItems: num(value.max_items) ?? num(value.max_n),
  };
}

// ── The live run (NDJSON events) ─────────────────────────────────────────────

export interface ReferenceRunState {
  runId: string | null;
  itemCount: number | null;
  referenceModel: string | null;
  verdicts: Record<string, ReferenceVerdict>;
  failures: Record<string, ReferenceFailure>;
  finished: boolean;
  summary: {
    done: number;
    failed: number;
    agreementRate: number | null;
    costUsd: number | null;
  } | null;
  /** A stream-level failure (the run itself, not one item). */
  error: string | null;
}

export const EMPTY_RUN: ReferenceRunState = {
  runId: null,
  itemCount: null,
  referenceModel: null,
  verdicts: {},
  failures: {},
  finished: false,
  summary: null,
  error: null,
};

/**
 * The run's event name. The server sends each as a typed `data` payload
 * (`{event: "data", data: {type: "decision_reference_item", …}}`); the bare
 * names are read too.
 */
export function runEventName(envelope: { event: string; data: unknown }): string {
  if (envelope.event === "data" && isJsonObject(envelope.data)) {
    const type = str(envelope.data.type);
    if (type) return type.replace(/^decision_reference_/, "").replace(/^item/, "reference_item");
  }
  return envelope.event;
}

/** Fold one `{event, data}` envelope into the run. Unknown events are ignored. */
export function applyRunEvent(
  state: ReferenceRunState,
  envelope: { event: string; data: unknown },
): ReferenceRunState {
  const data: Record<string, unknown> = isJsonObject(envelope.data) ? envelope.data : {};
  switch (runEventName(envelope)) {
    case "run_started":
      return {
        ...state,
        runId: str(data.run_id),
        itemCount: num(data.item_count),
        referenceModel: modelName(data.reference_model),
      };
    case "reference_item": {
      const itemId = str(data.item_id);
      if (!itemId) return state;
      const failures = { ...state.failures };
      delete failures[itemId];
      return {
        ...state,
        failures,
        verdicts: {
          ...state.verdicts,
          [itemId]: {
            id: str(data.reference_id),
            itemId,
            runId: str(data.run_id) ?? state.runId,
            referenceModel: state.referenceModel,
            answer: str(data.reference_verdict) ?? answerKey(data.reference_answer),
            pAnswer: num(data.reference_p),
            agree: bool(data.agree),
            costUsd: num(data.cost_usd),
            latencyMs: num(data.latency_ms),
            createdAt: new Date().toISOString(),
            probability: null,
            probabilities: data.reference_probabilities ?? data.probabilities ?? null,
            rawAnswer: data.reference_answer ?? null,
          },
        },
      };
    }
    case "reference_item_failed": {
      const itemId = str(data.item_id);
      if (!itemId) return state;
      return {
        ...state,
        failures: {
          ...state.failures,
          [itemId]: {
            itemId,
            question: str(data.question),
            error: str(data.error) ?? "The reference model did not answer.",
          },
        },
      };
    }
    case "run_done":
      return {
        ...state,
        finished: true,
        summary: {
          done: num(data.done) ?? Object.keys(state.verdicts).length,
          failed: num(data.failed) ?? Object.keys(state.failures).length,
          agreementRate: num(data.agreement_rate),
          costUsd: num(data.cost_usd),
        },
      };
    case "error": {
      const message = str(data.message) ?? str(data.user_message) ?? str(data.error);
      return { ...state, error: message ?? "The reference run stopped." };
    }
    default:
      return state;
  }
}

// ── Reliability against the reference (calibration response `reference`) ────

export interface ReferenceGroup {
  version: number;
  question: string;
  n: number;
  agreementRate: number | null;
  probabilityBins: CurveBin[];
  confidenceBins: CurveBin[];
  referenceModel: string | null;
}

function readBins(value: unknown): CurveBin[] {
  const list = isJsonObject(value) ? value.bins : value;
  if (!Array.isArray(list)) return [];
  return list.flatMap((b) => {
    if (!isJsonObject(b)) return [];
    const lower = num(b.lower);
    const upper = num(b.upper);
    const count = num(b.count);
    const mean = num(b.mean_predicted);
    const observed = num(b.observed_accuracy) ?? num(b.observed_agreement);
    if (lower == null || upper == null || count == null || mean == null || observed == null) return [];
    return [{ lower, upper, count, mean_predicted: mean, observed_accuracy: observed, gap: num(b.gap) ?? observed - mean }];
  });
}

/**
 * Agreement with the reference, per version × question: each calibration
 * group's `reference` block (`ReferenceCalibration`). [] when none was checked.
 */
export function readReferenceGroups(report: unknown): ReferenceGroup[] {
  if (!isJsonObject(report) || !Array.isArray(report.groups)) return [];
  return report.groups.flatMap((g) => {
    if (!isJsonObject(g) || !isJsonObject(g.reference)) return [];
    const ref = g.reference;
    const version = num(g.version);
    const question = str(g.question);
    if (version == null || !question) return [];
    const models = Array.isArray(ref.reference_models)
      ? ref.reference_models.flatMap((m) => (str(m) ? [m as string] : []))
      : [];
    return [
      {
        version,
        question,
        n: num(ref.n) ?? 0,
        agreementRate: num(ref.agreement_rate),
        probabilityBins: readBins(ref.probability),
        confidenceBins: readBins(ref.confidence),
        referenceModel: models.length > 0 ? models.join(", ") : null,
      },
    ];
  });
}
