/**
 * Review search results — the platform primitive's contract (FEATURE.md beside this file).
 *
 * A feature hands the panel a SESSION: a set of web results, the subject they are being judged
 * against, a vocabulary of answers, the current answers and an `onAnswer` adapter. The panel never
 * persists anything itself — the adapter decides where an answer lives (memory, a table, an RPC).
 */

export type ReviewSentiment = "positive" | "neutral" | "negative";

/** One place a result was found (an engine's rank for one query). */
export interface ReviewHit {
  engine: string;
  rank: number;
  query: string;
  endpoint?: string | null;
}

/** One result to judge. `result` is the raw provider object (Brave/Google) or a `web_result` kind value. */
export interface ReviewResult {
  /** Stable key — the adapter's identity for this result. */
  key: string;
  result: Record<string, unknown>;
  /** Every engine/query/rank that found it, best first. */
  hits: ReviewHit[];
}

/** Who/what the results are judged against. */
export interface ReviewSubject {
  /** "brand", "person", "topic", … — shown as the subject's type. */
  type: string;
  name: string;
  /** Optional mark (logo/avatar URL). */
  imageUrl?: string | null;
}

/** One answer in the vocabulary. */
export interface ReviewChoice {
  key: string;
  label: string;
  /** Group label (a brand relation's stance: Ours, About us, …). */
  group?: string | null;
  /** One-line meaning — hover only. */
  description?: string | null;
  /** The answer also asks positive / neutral / negative. */
  hasSentiment?: boolean;
  /** Shown as a one-click button; the rest live in the "More" picker. */
  pinned?: boolean;
}

/** The person's answer for one result. */
export type ReviewAnswer =
  | { status: "answered"; kind: string; sentiment: ReviewSentiment | null }
  | { status: "later" }
  | { status: "ignored" };

/** The "we think" slot — glows, never pre-selects. Grounding fields are hover-only. */
export interface ReviewSuggestion {
  kind: string;
  sentiment?: ReviewSentiment | null;
  /** 0–1 when the suggester gives one. */
  probability?: number | null;
  reason: string;
  evidence?: string[];
  /** Who suggested it: "rules", an agent name… — hover only. */
  by?: string | null;
}

export interface SearchReviewSession {
  /** Window title override; default "Review search results". */
  title?: string | null;
  subject: ReviewSubject;
  results: ReviewResult[];
  choices: ReviewChoice[];
  answers: Record<string, ReviewAnswer>;
  suggestions?: Record<string, ReviewSuggestion | null | undefined>;
  /** The persistence adapter. `null` clears the answer. May be async; a rejection is shown on the row. */
  onAnswer: (key: string, answer: ReviewAnswer | null) => void | Promise<void>;
}
