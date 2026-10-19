/**
 * The pure half of the Tool control screens: states in plain words, the success rate WITH its sample size,
 * the roll-up from sources to Tools, the 48-hour uptime strip and the merged history.
 * Every sentence is our own language for an admin — a person turning something on or off needs to know
 * what state it is in and why, in as few words as a label allows.
 */

import { formatCount, formatDurationMs } from "@ai-matrx/kit/format";
import type {
  AccountState,
  ControlLogEntry,
  EndpointRow,
  EntryRow,
  ProviderRow,
  ScorecardRow,
  SourceState,
  StripRow,
  Tone,
  ToolState,
} from "./types";

export function stateWords(state: ToolState | SourceState | AccountState): { label: string; tone: Tone } {
  switch (state) {
    case "live":
      return { label: "On", tone: "success" };
    case "paused":
      return { label: "Paused", tone: "muted" };
    case "off":
      return { label: "Off", tone: "danger" };
    case "auto_off":
      return { label: "Switched off", tone: "danger" };
    case "verifying":
      return { label: "Checking", tone: "warning" };
    case "draft":
      return { label: "Draft", tone: "muted" };
    case "retired":
      return { label: "Retired", tone: "muted" };
  }
}

/** "98% · 120 calls", or the honest "No calls yet". The rate is the share of counted calls that got an answer. */
export function successLabel(card: Pick<ScorecardRow, "samples" | "decided"> | undefined): string {
  if (!card || card.samples === 0) return "No calls yet";
  const pct = Math.round((card.decided / card.samples) * 100);
  return `${pct}% · ${formatCount(card.samples)} ${card.samples === 1 ? "call" : "calls"}`;
}

export function speedLabel(ms: number | null | undefined): string {
  return formatDurationMs(ms, { style: "compact", fallback: "—" });
}

/** Why a log line happened, in words. */
export function reasonWords(entry: ControlLogEntry): string {
  const s = entry.snapshot ?? {};
  switch (entry.reason) {
    case "consecutive_unexpected":
      return `${s.consecutive ?? "Several"} unexpected errors in a row`;
    case "window_error_pct":
      return `${s.pct ?? "Many"}% of the last ${s.samples ?? "recent"} calls failed`;
    case "not_served":
      return "The source said it does not serve this";
    case "account_auth":
      return "The account's key was refused";
    case "account_credit":
      return "The account is out of credit";
    case "verification_passed":
      return "A check passed";
    case "verification_failed":
      return "A check did not pass";
    case "turned_on_after_verification":
      return "Turned on after a passing check";
    case "manual":
      return entry.note ? `By hand: ${entry.note}` : "By hand";
    default:
      return entry.reason ? entry.reason.replace(/_/g, " ") : "";
  }
}

export function actorWords(entry: ControlLogEntry): string {
  if (entry.actor === "system") return "The guard";
  if (entry.actor === "verification") return "A check";
  if (entry.actor === "upkeep") return "Upkeep";
  return "An admin";
}

export interface ToolRow {
  tool_id: string;
  name: string;
  family: string;
  state: ToolState;
  sources: number;
  sourcesOn: number;
  samples: number;
  decided: number;
  p50_ms: number | null;
  last_success_at: string | null;
}

/** One row per Tool: how many sources are on, and the 7-day numbers summed over its sources. */
export function rollupTools(
  entries: readonly EntryRow[],
  endpoints: readonly EndpointRow[],
  cards7: readonly ScorecardRow[],
): ToolRow[] {
  const cardBy = new Map(cards7.map((c) => [c.endpoint_id, c]));
  const byTool = new Map<string, EndpointRow[]>();
  for (const e of endpoints) {
    if (e.state === "retired") continue;
    byTool.set(e.tool_id, [...(byTool.get(e.tool_id) ?? []), e]);
  }
  return entries.map((entry) => {
    const eps = byTool.get(entry.tool_id) ?? [];
    const cards = eps.map((e) => cardBy.get(e.id)).filter((c): c is ScorecardRow => Boolean(c));
    const speeds = cards.map((c) => c.p50_ms).filter((m): m is number => m != null).sort((a, b) => a - b);
    const lasts = cards.map((c) => c.last_success_at).filter((t): t is string => Boolean(t)).sort();
    return {
      tool_id: entry.tool_id,
      name: entry.display_name,
      family: entry.job_family,
      state: entry.state,
      sources: eps.length,
      sourcesOn: eps.filter((e) => e.state === "live").length,
      samples: cards.reduce((n, c) => n + c.samples, 0),
      decided: cards.reduce((n, c) => n + c.decided, 0),
      p50_ms: speeds.length ? speeds[Math.floor((speeds.length - 1) / 2)] : null,
      last_success_at: lasts.length ? lasts[lasts.length - 1] : null,
    };
  });
}

export type StripCell = { start: string; kind: "ok" | "some" | "bad" | "none"; title: string };

/** 48 hourly cells ending at the current hour: answered (ok), some errors (some), mostly errors (bad), no calls (none). */
export function stripCells(rows: readonly StripRow[], now: number = Date.now(), hours = 48): StripCell[] {
  const hourMs = 3_600_000;
  const end = Math.floor(now / hourMs) * hourMs;
  const by = new Map(rows.map((r) => [Math.floor(new Date(r.bucket_start).getTime() / hourMs) * hourMs, r]));
  return Array.from({ length: hours }, (_, i) => {
    const start = end - (hours - 1 - i) * hourMs;
    const row = by.get(start);
    const startIso = new Date(start).toISOString();
    if (!row) return { start: startIso, kind: "none" as const, title: "No calls" };
    const total = row.hits + row.misses + row.unexpected_errors;
    if (total === 0) return { start: startIso, kind: "none" as const, title: "No calls" };
    const kind = row.unexpected_errors === 0 ? "ok" : row.unexpected_errors * 2 >= total ? "bad" : "some";
    return { start: startIso, kind, title: `${total} calls, ${row.unexpected_errors} failed` };
  });
}

/** One log entry as a sentence. A check says whether it changed anything; a state change says to what. */
export function historyLine(e: ControlLogEntry): string {
  if (e.kind === "order") return `${actorWords(e)}: order ${e.from ?? "unset"} → ${e.to}${e.note ? ` — ${e.note}` : ""}`;
  if (e.reason === "verification_passed") return `${actorWords(e)} ran a check — it passed, now on`;
  if (e.reason === "verification_failed") return `${actorWords(e)} ran a check — it did not pass, stays off`;
  const label = stateWords(e.to as ToolState).label.toLowerCase();
  const why = reasonWords(e);
  return `${actorWords(e)}: ${label}${why ? ` — ${why}` : ""}`;
}

export interface HistoryLine {
  at: string;
  subject: string;
  line: string;
}

/** Everything that changed state under one Tool, newest first: the Tool, its sources and their accounts. */
export function mergeHistory(
  entry: EntryRow,
  endpoints: readonly EndpointRow[],
  providers: readonly ProviderRow[],
): HistoryLine[] {
  const lines: HistoryLine[] = [];
  const add = (subject: string, log: ControlLogEntry[] | undefined) => {
    for (const e of log ?? []) {
      if (e.to === "verifying") continue;
      lines.push({ at: e.at, subject, line: historyLine(e) });
    }
  };
  add(entry.display_name, entry.metadata?.control_log);
  const names = new Map(providers.map((p) => [p.slug, p.admin_name]));
  for (const ep of endpoints) {
    add(`${names.get(ep.provider_slug) ?? ep.provider_slug}${ep.via === "treg" ? " (aggregator)" : ""}`, ep.metadata?.control_log);
  }
  for (const p of providers) add(`${p.admin_name} account`, p.metadata?.control_log);
  return lines.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}

/** The refusal a person can fix by running a check. */
export function isCheckRequired(refusal: string | null | undefined): boolean {
  return refusal === "verification_required";
}
