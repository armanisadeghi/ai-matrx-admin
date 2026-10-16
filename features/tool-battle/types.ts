import type { Database } from "@/types/database.types";

export type BattleRow = Database["tool"]["Tables"]["battle"]["Row"];
export type CellRow = Database["tool"]["Tables"]["battle_cell"]["Row"];

export type BattleStatus = "draft" | "running" | "completed" | "failed" | "cancelled";
export type CellStatus = "queued" | "running" | "succeeded" | "empty" | "failed" | "refused" | "cancelled";
export type Via = "direct" | "treg";

export interface Lane {
  lane_id: string;
  endpoint_id: string;
  label: string;
  provider_slug: string | null;
  via: Via | null;
}

export interface Subject {
  subject_id: string;
  label: string;
  inputs: Record<string, unknown>;
  pool_id: string | null;
}

export interface AnswerField {
  path: string;
  filled: boolean;
  type: string;
  sample: string | null;
}

export interface Evidence {
  verified: boolean;
  clean: boolean;
  problems: string[];
  attempts: number;
}

export interface LaneRollup {
  cells: number;
  succeeded: number;
  empty: number;
  failed: number;
  refused: number;
  cancelled: number;
  success_rate: number | null;
  hit_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  p50_ok_ms: number | null;
  cost_usd: number;
  points: number;
  cost_per_success_usd: number | null;
  points_per_success: number | null;
  mean_filled_fields: number | null;
}

export interface CoverageRow {
  path: string;
  /** Per lane: share of that lane's succeeded cells where the path was filled (null: lane had none). */
  rates: Record<string, number | null>;
  only_in: string | null;
  missing_in: string[];
}

export interface BattleSummary {
  lanes: Record<string, LaneRollup>;
  ranking: string[];
  coverage: CoverageRow[];
  subjects: number;
}

export interface Promotion {
  at: string;
  by: string;
  order: string[];
  endpoint_order: string[];
  before: Record<string, number | null>;
  after: Record<string, number>;
}

/** A battle row read into the shapes the page uses. */
export interface BattleView {
  id: string;
  title: string;
  jobKey: string;
  toolId: string | null;
  status: BattleStatus;
  blind: boolean;
  blindOrder: string[];
  lanes: Lane[];
  subjects: Subject[];
  summary: BattleSummary | null;
  promotions: Promotion[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface CellView {
  id: string;
  laneId: string;
  subjectId: string;
  status: CellStatus;
  heartbeatAt: string | null;
  callId: string | null;
  providerSlug: string | null;
  via: Via | null;
  wallMs: number | null;
  vendorMs: number | null;
  costUsd: number | null;
  points: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  output: unknown;
  answerFields: AnswerField[];
  rawFields: string[];
  ignoredFilters: { input: string; label: string }[];
  evidence: Evidence | null;
}

/** A job a battle can compare sources for (a catalog Tool). */
export interface BattleJob {
  toolId: string;
  jobKey: string;
  displayName: string;
  jobFamily: string;
  parameters: Record<string, unknown>;
}

/** One way to get a job done (a catalog endpoint) with its provider's admin name. */
export interface BattleSource {
  endpointId: string;
  providerSlug: string;
  providerName: string;
  via: Via;
  state: string;
  priority: number | null;
  supportedInputs: string[];
  trapNotes: string | null;
}
