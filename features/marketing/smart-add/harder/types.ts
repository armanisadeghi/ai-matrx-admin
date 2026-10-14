/**
 * Smart Add · the person "harder" path (PATHS.md `person_harder`; VISION Part 10) — the shapes of aidream
 * `POST /brand-intake/person-harder/round` (services/brand_intake/person_harder.py, its Pydantic models).
 */
import type { HelperCandidate, HelperCostLine } from "../helpers/types";

export type ClueKind = "employer" | "title" | "city" | "handle" | "site";
export interface Clue {
  kind: ClueKind;
  value: string;
  source_url: string | null;
}

export type AnchorKind = "social" | "personal_site" | "employer_bio" | "licence" | "mention";
export type HarderBucket = "directory" | "social" | "web" | "aggregator";

export interface HarderCandidate extends HelperCandidate {
  bucket: HarderBucket;
  score: number;
  reasons: string[];
  anchor_kind: AnchorKind;
  firm: boolean;
  clues: Clue[];
  /** The find-anything tier (strong → mid → low → junk), so the list shows the best first and junk last. */
  tier?: string;
  tier_reason?: string;
}

export interface DirectoryQuestion {
  platform: string;
  pages: string[];
  candidates: HarderCandidate[];
  job: { snapshot_id: string | null; started_at?: number; cap?: number } | null;
}

export interface QueryLog {
  query: string;
  page: number;
  why: string;
  results: number;
}

export interface HarderResult {
  path: string;
  directory: DirectoryQuestion | null;
  socials: Record<string, HarderCandidate[]>;
  web: HarderCandidate[];
  filtered_aggregators: string[];
  aggregator_clues: HarderCandidate[];
  queries: QueryLog[];
  decisions: string[];
  more: Record<string, boolean>;
  ms: number;
  points: number | null;
  error: string | null;
  costs: HelperCostLine[];
  requests: Record<string, unknown>[];
}

export interface HarderRequest {
  name: string;
  city: string | null;
  occupation: string | null;
  company: string | null;
  extra: string | null;
  clues: Clue[];
  done_queries: string[];
  page: number;
  deepen: string | null;
  first: boolean;
}

/** The answer on one result. Directory / socials: pick one or none; web pages: yes / not me / skip. */
export type HarderAnswer = "me" | "not_me" | "skip";

/** One entry of the find-you log (the Builder panel's Decisions tab). */
export interface FindLogEntry {
  at: number;
  kind: "round" | "answer" | "clue" | "anchor" | "escalation";
  text: string;
  bucket?: string | null;
  url?: string | null;
  points?: number | null;
}

/* ── the person hard / close-to-impossible paths (aidream services/brand_intake/person_hard.py) ── */

export type FindYouPath = "person_hard" | "person_near_impossible";
export type SweepTier = "strong" | "mid" | "low" | "junk";

export interface SweepHit {
  engine: string;
  query: string;
  page: number;
  rank: number;
}

/** One sweep result: the provider's raw row (unchanged) and how it was judged. */
export interface SweepRow {
  key: string;
  url: string;
  platform: string;
  handle: string | null;
  title: string | null;
  snippet: string | null;
  raw: Record<string, unknown>;
  hits: SweepHit[];
  tier: SweepTier;
  tier_reason: string;
  named: boolean;
  score: number;
  reasons: string[];
  anchor_kind: AnchorKind;
  firm: boolean;
  clues: Clue[];
}

export interface SweepCall {
  engine: string;
  query: string;
  page: number;
  results: number;
  ms: number;
  points: number | null;
  /** Admins only. */
  usd: number | null;
  error: string | null;
  why: string;
}

export interface SweepFilter {
  key: string;
  label: string;
  removed: number;
  urls: string[];
}

export interface TierCount {
  key: SweepTier;
  label: string;
  count: number;
  hidden_by_default: boolean;
}

export interface FindYouResult extends HarderResult {
  sweep_path: FindYouPath;
  rules: Record<string, unknown>;
  rows: SweepRow[];
  tiers: TierCount[];
  filters: SweepFilter[];
  calls: SweepCall[];
  google_next_page: number | null;
  platforms_first: boolean;
}

export interface FindYouRequest extends HarderRequest {
  path: FindYouPath;
  known_urls: string[];
  google_page: number;
  /** Escalation: only the extra queries the deeper path adds. */
  extras_only?: boolean;
}

/** The answer on one sweep row (one click). */
export type SweepAnswer = "me" | "maybe" | "not_me";

/** A focused platform session on the stuck screen: opened, then done (with or without a find). */
export interface FocusState {
  status: "open" | "done";
  found: boolean;
}

/** `person.find_you` — the run input the mandate provisions read (raw provider rows kept). */
export interface FindYouProvision {
  path: string;
  clues: Clue[];
  buckets: {
    tiers: { key: SweepTier; label: string; rows: SweepRow[] }[];
    directory: HarderCandidate[];
    socials: Record<string, HarderCandidate[]>;
    web: HarderCandidate[];
    filters: SweepFilter[];
  };
  history: { query: string; answer: string; firm_anchor: boolean; bucket: string | null; url?: string | null }[];
  focus: Record<string, FocusState>;
}
