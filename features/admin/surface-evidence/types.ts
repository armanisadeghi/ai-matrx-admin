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
