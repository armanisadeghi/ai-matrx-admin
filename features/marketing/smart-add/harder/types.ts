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
