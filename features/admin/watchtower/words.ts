import type { AlarmState, CanaryRunRow, ScorecardRow } from "./types";

export type Tone = "danger" | "warning" | "success" | undefined;

export function alarmWords(state: AlarmState): { label: string; tone: Tone } {
  if (state === "failing") return { label: "Failing", tone: "danger" };
  if (state === "degraded") return { label: "Degraded", tone: "warning" };
  if (state === "ok") return { label: "OK", tone: "success" };
  if (state === "paused") return { label: "Paused", tone: undefined };
  return { label: "Not checked", tone: undefined };
}

export function outcomeWords(outcome: CanaryRunRow["outcome"] | string | null): { label: string; tone: Tone } {
  switch (outcome) {
    case "pass":
      return { label: "Pass", tone: "success" };
    case "fail":
    case "error":
      return { label: outcome === "fail" ? "Fail" : "Error", tone: "danger" };
    case "empty":
      return { label: "Empty", tone: "warning" };
    case "refused":
      return { label: "Refused", tone: "warning" };
    case "skipped":
      return { label: "Skipped", tone: undefined };
    default:
      return { label: "None", tone: undefined };
  }
}

export function percent(rate: number | null): string {
  return rate === null ? "n/a" : `${Math.round(rate * 100)}%`;
}

export function seconds(value: number | null): string {
  if (value === null) return "n/a";
  return value < 10 ? `${value.toFixed(1)} s` : `${Math.round(value)} s`;
}

/** Features first that need a person, then the rest by group. */
export function sortScorecards(rows: readonly ScorecardRow[]): ScorecardRow[] {
  const rank: Record<AlarmState, number> = { failing: 0, degraded: 1, ok: 2, paused: 3, unknown: 4 };
  return rows
    .filter((r) => r.feature_key !== "_daily_note")
    .slice()
    .sort((a, b) => rank[a.alarm_state] - rank[b.alarm_state] || a.group_key.localeCompare(b.group_key) || a.feature_key.localeCompare(b.feature_key));
}

export function dailyNote(rows: readonly ScorecardRow[]): string | null {
  return rows.find((r) => r.feature_key === "_daily_note")?.alarm_reason ?? null;
}
