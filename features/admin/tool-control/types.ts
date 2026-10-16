/** Row shapes of the Tool control plane, as the database returns them (tool.catalog_* and the scorecard views). */

export type ToolState = "live" | "paused" | "off" | "draft" | "retired";
export type SourceState = "draft" | "verifying" | "live" | "paused" | "auto_off" | "retired";
export type AccountState = "live" | "paused" | "auto_off";

/** One line of a row's capped control log (newest first), written by the database functions. */
export interface ControlLogEntry {
  at: string;
  from: string | null;
  to: string;
  actor?: "system" | "admin" | "verification" | "upkeep" | string;
  by?: string | null;
  reason?: string | null;
  note?: string | null;
  call_id?: string | null;
  snapshot?: { consecutive?: number; threshold?: number; pct?: number; samples?: number; error_class?: string } | null;
}

interface WithLog {
  metadata: { control_log?: ControlLogEntry[] } | null;
}

export interface EntryRow extends WithLog {
  tool_id: string;
  job_key: string;
  job_family: string;
  display_name: string;
  state: ToolState;
}

export interface EndpointRow extends WithLog {
  id: string;
  tool_id: string;
  provider_slug: string;
  via: "direct" | "treg";
  vendor_op: string;
  state: SourceState;
  verified_at: string | null;
  last_probe: { call_id?: string | null; outcome?: string; error_class?: string | null; latency_ms?: number | null; at?: string } | null;
}

export interface ProviderRow extends WithLog {
  slug: string;
  admin_name: string;
  state: AccountState;
  direct_account: boolean;
}

export interface ScorecardRow {
  endpoint_id: string;
  window_days: 7 | 30;
  samples: number;
  decided: number;
  hits: number;
  unexpected_errors: number;
  hit_rate: number | null;
  unexpected_error_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  last_success_at: string | null;
  last_error_at: string | null;
  consecutive_unexpected: number;
}

export interface StripRow {
  endpoint_id: string;
  bucket_start: string;
  hits: number;
  misses: number;
  unexpected_errors: number;
}

export type Tone = "success" | "warning" | "danger" | "muted" | undefined;
