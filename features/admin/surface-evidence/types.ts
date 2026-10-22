/**
 * Wire shapes of aidream `POST /admin/surface-evidence/runs`
 * (aidream/services/surface_evidence/wire.py). Mirrors SurfaceEvidence field for field;
 * swap to the generated `@ai-matrx/api` contract once it publishes the route.
 */

export interface SurfaceEvidenceQuery {
  source_feature?: string;
  ui_surface?: string;
  mandate_key?: string;
  agent_ids?: string[];
  days?: number;
  exclude_test_accounts?: boolean;
  errors_only?: boolean;
  include_runs?: boolean;
}

export interface ToolUse {
  name: string;
  count: number;
  failures: number;
  errors: string[];
  total_ms: number;
  max_ms: number;
}

export interface SuppliedContext {
  key: string;
  label: string | null;
  chars: number | null;
  delivery: string | null;
  included: boolean;
  value_preview: string | null;
}

export interface FetchedContext {
  target: string;
  count: number;
  failures: number;
}

export interface RunEvidence {
  request_id: string;
  conversation_id: string | null;
  created_at: string;
  status: string;
  agent_id: string | null;
  agent_name: string | null;
  mandate_key: string | null;
  source_app: string;
  source_feature: string;
  ui_surface: string | null;
  turns: number;
  tool_calls_total: number;
  tool_failures: number;
  tools: ToolUse[];
  context_supplied: SuppliedContext[];
  context_fetched: FetchedContext[];
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  cost_display: string;
  latency_ms: number | null;
  first_message: string | null;
  person: string | null;
  is_test_account: boolean;
  error: string | null;
  why: string;
  why_detail: string;
}

export interface CostPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p99: number;
  max: number;
  total: number;
  p50_display: string;
  p90_display: string;
  max_display: string;
  total_display: string;
}

export interface SurfaceEvidence {
  window_start: string;
  window_end: string;
  runs_scanned: number;
  hit_max_runs: boolean;
  cost: CostPercentiles;
  why_counts: Record<string, number>;
  most_fetched_context: FetchedContext[];
  runs: RunEvidence[];
}

/**
 * Wire shapes of aidream `POST /admin/surface-evidence/receives`
 * (aidream/services/surface_evidence/receives.py, W6-A): the exact context blocks an agent
 * receives from a surface — composed now (a surface + values, or the last probe's values),
 * or a sent turn's stored text.
 */
export interface SurfaceReceivesQuery {
  surface?: string;
  values?: Record<string, unknown>;
  from_last_check?: boolean;
  agent_id?: string;
  organization_id?: string;
  live_tool_names?: string[];
  live_write_targets?: string[];
  conversation_id?: string;
  message_id?: string;
  request_id?: string;
}

export interface ReceivedBlock {
  id: string;
  label: string;
  chars: number | null;
  sha256: string | null;
  /** The exact text; null when only the hash was kept. */
  text: string | null;
  retained: boolean;
  source: string | null;
  note: string | null;
}

export interface SituationParagraph {
  surface: string;
  level: "ancestor" | "page";
  text: string;
  /** Character offset in `situation`; null when the paragraph is not there. */
  at: number | null;
}

export interface ReceivesChecks {
  paragraphs: SituationParagraph[];
  chain_order_ok: boolean | null;
  raw_blanks: string[];
  not_known: string[];
}

export interface SurfaceReceives {
  mode: "composed" | "stored";
  surface: string | null;
  /** `payload` · `last_check` · `none` (composed) or `turn` (stored). */
  values_source: string;
  last_check_at: string | null;
  values: Record<string, unknown>;
  conversation_id: string | null;
  message_id: string | null;
  blocks: ReceivedBlock[];
  situation: string | null;
  checks: ReceivesChecks;
  says: string;
}
