/** One feature's scorecard (`tool.feature_scorecard`) and one canary call (`tool.canary_run`). */
export type AlarmState = "ok" | "failing" | "degraded" | "unknown";

export interface ScorecardRow {
  feature_key: string;
  label: string;
  group_key: string;
  tool_name: string | null;
  canary_samples: number;
  real_samples: number;
  success_rate: number | null;
  baseline_rate: number | null;
  recent_rate: number | null;
  p50_seconds: number | null;
  p90_seconds: number | null;
  avg_points: number | null;
  points_window: number;
  shape_misses: number;
  refusals: number;
  last_success_at: string | null;
  last_canary_at: string | null;
  last_outcome: string | null;
  consecutive_failures: number;
  alarm_state: AlarmState;
  alarm_reason: string | null;
  alarm_since: string | null;
  computed_at: string;
}

export interface WatchtowerSnapshot {
  points_24h: number;
  last_round_at: string | null;
  scorecards: ScorecardRow[];
}

export interface CanaryRunRow {
  id: string;
  feature_key: string;
  route: string;
  method: string;
  outcome: "pass" | "fail" | "refused" | "empty" | "error" | "skipped";
  http_status: number | null;
  call_status: string | null;
  seconds: number | null;
  points: number;
  sanity: string;
  subject_label: string | null;
  edge_case: string | null;
  error_text: string | null;
  call_id: string | null;
  trigger: string;
  ran_at: string;
}
