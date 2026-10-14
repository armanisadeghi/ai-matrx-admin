/**
 * Builder panel — the Decisions view: for every workflow run (a Smart Add round), the path the run chose
 * (aidream `brand.identify.path_decision`, its `path_decision` output as stored), every signal against its
 * threshold, the entry checks, any escalation, the steps the run skipped with their reasons (the run story's
 * greyed rows), and the run's hard cost; plus the cost per path across runs.
 * Design: common-docs/.../smart-add-brand/PATHS.md. Pure; reads stored records only, never reshapes them.
 */
import type { RunTruth } from "./data";
import type { StoryRow, StoryRun } from "./story";

export interface PathSignal {
  key: string;
  label: string;
  value: unknown;
  threshold: unknown;
  op: string | null;
  fired: boolean;
  source: string;
}

export interface PathCheck {
  path: string;
  passed: boolean;
  because: string[];
}

export interface PathDecision {
  subject: string;
  subjectSource: string;
  path: string;
  label: string;
  status: string;
  built: boolean;
  runsAs: string;
  why: string;
  measured: boolean;
  roundKind: string | null;
  signals: PathSignal[];
  checks: PathCheck[];
  escalation: { from: string; to: string; reason: string } | null;
  thresholdsSource: string;
  flag: string | null;
  exit: string | null;
  subjectHint: Record<string, unknown> | null;
  /** The record exactly as stored. */
  raw: Record<string, unknown>;
}

export interface RoundDecision {
  runId: string;
  label: string;
  at: number;
  /** The `path_decision` step id (story row) when it ran. */
  stepRowId: string | null;
  decision: PathDecision | null;
  /** Why no decision: the step skipped (its note) or never ran. */
  missing: string | null;
  skipped: { title: string; reason: string }[];
  costUsd: number;
}

export const PATH_STEP = "path_decision";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function parsePathDecision(value: unknown): PathDecision | null {
  const r = rec(value);
  if (!str(r.path)) return null;
  const signals: PathSignal[] = Array.isArray(r.signals)
    ? r.signals.map((s) => {
        const x = rec(s);
        return {
          key: str(x.key),
          label: str(x.label) || str(x.key),
          value: x.value ?? null,
          threshold: x.threshold ?? null,
          op: typeof x.op === "string" ? x.op : null,
          fired: x.fired === true,
          source: str(x.source),
        };
      })
    : [];
  const checks: PathCheck[] = Array.isArray(r.checks)
    ? r.checks.map((c) => {
        const x = rec(c);
        return {
          path: str(x.path),
          passed: x.passed === true,
          because: Array.isArray(x.because) ? x.because.filter((b): b is string => typeof b === "string") : [],
        };
      })
    : [];
  const esc = rec(r.escalation);
  return {
    subject: str(r.subject),
    subjectSource: str(r.subject_source),
    path: str(r.path),
    label: str(r.label) || str(r.path),
    status: str(r.status),
    built: r.built === true,
    runsAs: str(r.runs_as) || str(r.path),
    why: str(r.why),
    measured: r.measured === true,
    roundKind: str(r.round_kind) || null,
    signals,
    checks,
    escalation: str(esc.to) ? { from: str(esc.from), to: str(esc.to), reason: str(esc.reason) } : null,
    thresholdsSource: str(r.thresholds_source),
    flag: str(r.flag) || null,
    exit: str(r.exit) || null,
    subjectHint: r.subject_hint ? rec(r.subject_hint) : null,
    raw: r,
  };
}

/** "≤ 3", "≥ 0.3", "present" — the threshold as the signal compares it. */
export function thresholdText(s: PathSignal): string {
  if (s.op === "present") return "present";
  if (!s.op || s.threshold === null || s.threshold === undefined) return "";
  const op = { "<=": "≤", ">=": "≥", "<": "<", ">": ">" }[s.op] ?? s.op;
  return `${op} ${String(s.threshold)}`;
}

export function valueText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "none";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function buildDecisions(runs: StoryRun[], truth: RunTruth | null, story: StoryRow[]): RoundDecision[] {
  const seen = new Set<string>();
  const out: RoundDecision[] = [];
  for (const run of [...runs].sort((a, b) => a.at - b.at)) {
    if (seen.has(run.runId)) continue;
    seen.add(run.runId);
    const outcomes = (truth?.outcomes ?? []).filter((o) => o.runId === run.runId);
    const step = outcomes.find((o) => o.nodeId === PATH_STEP) ?? null;
    const out0 = rec(step?.output);
    const decision = parsePathDecision(out0.path_decision);
    const notes = Array.isArray(out0.notes) ? out0.notes.filter((n): n is string => typeof n === "string") : [];
    const runRow = truth?.runs.find((r) => r.id === run.runId);
    const missing = decision
      ? null
      : step
        ? notes[0] ?? "skipped"
        : runRow && runRow.status !== "running" && runRow.status !== "pending"
          ? "no path decision in this run"
          : "not decided yet";
    const costUsd = outcomes.reduce((sum, o) => {
      const c = rec(o.output).cost_usd;
      return sum + (typeof c === "number" ? c : 0);
    }, 0);
    out.push({
      runId: run.runId,
      label: run.label,
      at: run.at,
      stepRowId: step ? `step:${step.id}` : null,
      decision,
      missing,
      skipped: story
        .filter((r) => r.runId === run.runId && r.kind === "step" && r.status === "skipped")
        .map((r) => ({ title: r.title, reason: r.reason ?? "skipped" })),
      costUsd,
    });
  }
  return out;
}

/** Hard cost per path across the rounds (a round with no decision counts under "undecided"). */
export function costByPath(rounds: RoundDecision[]): { path: string; label: string; rounds: number; costUsd: number }[] {
  const by = new Map<string, { path: string; label: string; rounds: number; costUsd: number }>();
  for (const r of rounds) {
    const key = r.decision?.path ?? "undecided";
    const cur = by.get(key) ?? { path: key, label: r.decision?.label ?? "Undecided", rounds: 0, costUsd: 0 };
    cur.rounds += 1;
    cur.costUsd += r.costUsd;
    by.set(key, cur);
  }
  return [...by.values()];
}

/** The path label a run decided, for the run story's run row. */
export function runPathLabel(truth: RunTruth | null, runId: string): string | null {
  const step = (truth?.outcomes ?? []).find((o) => o.runId === runId && o.nodeId === PATH_STEP);
  const d = parsePathDecision(rec(step?.output).path_decision);
  if (!d) return null;
  return d.built ? d.label : `${d.label} (runs as ${d.runsAs.replace(/_/g, " ")})`;
}
