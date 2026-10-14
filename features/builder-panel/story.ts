/**
 * Builder panel — the run as a numbered story, in the order it happened.
 *
 * Row 0 is what the person typed and picked. Then, for every workflow run the page started, each
 * step of the definition the run used, in the order it finished, and inside a step each external
 * call it made (the aidream request ledger on `output.requests`). Search calls to one engine from
 * one step share a row (Google: "a" · "b" · "c"). A step that did nothing, or has not run, is a
 * greyed row with its reason (`ready_when` from the definition). Rows carry the stored records
 * untouched; only titles are written here. FEATURE: ./FEATURE.md.
 */
import type { DefinitionNode, NodeOutcomeRow, RunTruth } from "./data";
import type { RequestRow } from "./requests";
import type { BuilderEntry } from "./types";
import { runPathLabel } from "./decisions";

export type StoryRowKind = "inputs" | "run" | "step" | "call" | "record";
export type StoryStatus = "done" | "failed" | "skipped" | "waiting" | "running";

export interface StoryRow {
  id: string;
  kind: StoryRowKind;
  /** "0", "1", "2.1" — the place in the story. Run rows have none (they head a section). */
  number: string | null;
  title: string;
  /** The exact query, URL or point, when the row has one. */
  detail: string | null;
  status: StoryStatus | null;
  /** Why a greyed row did nothing ("waits for: name confirmed"). */
  reason: string | null;
  ms: number | null;
  costUsd: number | null;
  at: number;
  runId: string | null;
  nodeId: string | null;
  /** The step record (input, output, error) as stored. */
  outcome: NodeOutcomeRow | null;
  /** The external calls this row stands for, each with its exact request and response. */
  calls: RequestRow[];
  /** Published entries this row shows (the inputs row, a record row). */
  entries: BuilderEntry[];
  /** The step's icon name from the definition (lucide kebab-case). */
  icon: string | null;
}

export interface StoryRun {
  runId: string;
  label: string;
  at: number;
}

const READY_TEXT: Record<string, string> = {
  website: "a website",
  "confirmed.name": "name confirmed",
  "woken.name": "name confirmed",
  "confirmed.location": "location confirmed",
  "woken.location": "location confirmed",
  "confirmed.domain": "domain confirmed",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function waitsFor(node: DefinitionNode | undefined): string | null {
  if (!node?.readyWhen.length) return null;
  const parts = [...new Set(node.readyWhen.map((r) => READY_TEXT[r] ?? r))];
  return `waits for: ${parts.join(" · ")}`;
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** `Google web: "x"` → `"x"`; `Brave news: "x"` → `news: "x"`. The query text itself is never edited. */
function queryOf(call: RequestRow): string {
  const prefix = new RegExp(`^${call.provider}\\s+`, "i");
  return call.title.replace(prefix, "").replace(/^web:\s*/, "");
}

function callTitle(call: RequestRow): { title: string; detail: string | null } {
  const req = record(call.request);
  if (call.kind === "social_profile") {
    const platform = typeof req.platform === "string" ? req.platform : call.provider;
    const target = typeof req.handle_or_url === "string" ? req.handle_or_url : call.title;
    return { title: `${cap(platform)} lookup`, detail: target };
  }
  if (call.kind === "page_fetch") return { title: "Read the page", detail: call.title };
  if (call.kind === "scrape") return { title: "Scrape", detail: call.title };
  return { title: call.title, detail: null };
}

function callStatus(calls: RequestRow[]): StoryStatus {
  if (calls.some((c) => c.error || (typeof c.status === "number" && c.status >= 400))) return "failed";
  return "done";
}

function sumMs(calls: RequestRow[]): number | null {
  const list = calls.map((c) => c.ms).filter((m): m is number => typeof m === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) : null;
}

/** Calls of one step as rows: searches grouped per engine, everything else one row each, in order. */
function callRows(calls: RequestRow[]): { title: string; detail: string | null; calls: RequestRow[] }[] {
  const out: { title: string; detail: string | null; calls: RequestRow[]; key: string }[] = [];
  for (const c of [...calls].sort((a, b) => a.at - b.at)) {
    if (c.kind === "search") {
      const key = `search:${c.provider}`;
      const found = out.find((o) => o.key === key);
      if (found) {
        found.calls.push(c);
        continue;
      }
      out.push({ key, title: cap(c.provider || "Search"), detail: null, calls: [c] });
      continue;
    }
    const t = callTitle(c);
    out.push({ key: c.id, ...t, calls: [c] });
  }
  return out.map((o) => ({
    title: o.title,
    detail: o.key.startsWith("search:") ? o.calls.map(queryOf).join(" · ") : o.detail,
    calls: o.calls,
  }));
}

export function buildStory(
  entries: BuilderEntry[],
  runs: StoryRun[],
  truth: RunTruth | null,
  serverRows: RequestRow[],
): StoryRow[] {
  const rows: StoryRow[] = [];
  const inputs = entries.filter((e) => e.group === "inputs");
  rows.push({
    id: "inputs",
    kind: "inputs",
    number: "0",
    title: "What the person typed",
    detail: inputs
      .map((e) => (typeof e.data === "string" && e.data ? e.data : null))
      .filter(Boolean)
      .join(" · ") || null,
    status: null,
    reason: null,
    ms: null,
    costUsd: null,
    at: Math.min(...inputs.map((e) => e.firstAt || Infinity), Infinity),
    runId: null,
    nodeId: null,
    outcome: null,
    calls: [],
    entries: inputs,
    icon: "keyboard",
  });

  let n = 0;
  const ordered = [...runs].sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  for (const run of ordered) {
    if (seen.has(run.runId)) continue;
    seen.add(run.runId);
    const runRow = truth?.runs.find((r) => r.id === run.runId) ?? null;
    const def = truth?.definitions.find((d) => d.id === runRow?.definitionId) ?? null;
    const outcomes = (truth?.outcomes ?? []).filter((o) => o.runId === run.runId);
    const runCost = outcomes.reduce((sum, o) => {
      const c = record(o.output).cost_usd;
      return sum + (typeof c === "number" ? c : 0);
    }, 0);
    rows.push({
      id: `run:${run.runId}`,
      kind: "run",
      number: null,
      title: run.label,
      // The path the round chose (brand.identify.path_decision), beside the workflow name.
      detail: [def?.name, runPathLabel(truth, run.runId)].filter(Boolean).join(" · ") || null,
      status: runRow ? (runRow.status === "completed" ? "done" : runRow.status === "failed" ? "failed" : "running") : "running",
      reason: null,
      ms: runRow?.completedAt ? Date.parse(runRow.completedAt) - Date.parse(runRow.startedAt ?? runRow.createdAt) : null,
      costUsd: runCost || null,
      at: run.at,
      runId: run.runId,
      nodeId: null,
      outcome: null,
      calls: [],
      entries: [],
      icon: "workflow",
    });

    // Steps that finished, in the order they finished; then the definition's steps with no record.
    const sorted = [...outcomes].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
    const done = new Set(sorted.map((o) => o.nodeId));
    const active: StoryRow[] = [];
    const idle: StoryRow[] = [];
    for (const o of sorted) {
      const node = def?.nodes.find((x) => x.id === o.nodeId);
      const out = record(o.output);
      const calls = serverRows.filter((r) => r.runId === o.runId && r.nodeId === o.nodeId && r.id.includes(`:${o.itemIndex}:`));
      const evidence = Array.isArray(out.evidence) ? out.evidence.length : 0;
      const cost = typeof out.cost_usd === "number" && out.cost_usd > 0 ? out.cost_usd : null;
      const skipped = out.skipped === true;
      const didNothing = !calls.length && !evidence && !cost && Boolean(node?.readyWhen.length);
      const notes = Array.isArray(out.notes) ? out.notes.filter((x): x is string => typeof x === "string") : [];
      const base = {
        runId: o.runId,
        nodeId: o.nodeId,
        outcome: o,
        entries: [],
        icon: node?.icon ?? null,
        at: Date.parse(o.completedAt),
      };
      const label = node?.label ?? o.nodeId;
      if (o.error) {
        active.push({ ...base, id: `step:${o.id}`, kind: "step", number: null, title: label, detail: null, status: "failed", reason: null, ms: o.durationMs, costUsd: cost, calls });
        continue;
      }
      if (skipped || didNothing) {
        idle.push({
          ...base,
          id: `step:${o.id}`,
          kind: "step",
          number: null,
          title: label,
          detail: null,
          status: "skipped",
          reason: waitsFor(node) ?? (notes[0] ? `skipped: ${notes[0]}` : "skipped"),
          ms: o.durationMs,
          costUsd: null,
          calls,
        });
        continue;
      }
      const point = typeof out.point === "string" ? out.point : null;
      const groups = callRows(calls);
      if (groups.length === 1) {
        // One call: the step and its call are one row (Check the website · GET https://…).
        active.push({
          ...base,
          id: `step:${o.id}`,
          kind: "step",
          number: null,
          title: label,
          detail: groups[0].detail ?? groups[0].title,
          status: callStatus(calls),
          reason: null,
          ms: o.durationMs,
          costUsd: cost,
          calls,
        });
        continue;
      }
      active.push({
        ...base,
        id: `step:${o.id}`,
        kind: "step",
        number: null,
        title: label,
        detail: point ?? (groups.length ? `${calls.length} calls` : null),
        status: "done",
        reason: null,
        ms: o.durationMs,
        costUsd: cost,
        calls,
      });
      groups.forEach((g, i) => {
        active.push({
          ...base,
          id: `call:${o.id}:${i}`,
          kind: "call",
          number: null,
          title: g.title,
          detail: g.detail,
          status: callStatus(g.calls),
          reason: null,
          ms: sumMs(g.calls),
          costUsd: null,
          calls: g.calls,
        });
      });
    }
    for (const node of def?.nodes ?? []) {
      if (done.has(node.id)) continue;
      idle.push({
        id: `pending:${run.runId}:${node.id}`,
        kind: "step",
        number: null,
        title: node.label,
        detail: null,
        status: runRow && runRow.status !== "running" && runRow.status !== "pending" ? "skipped" : "waiting",
        reason: waitsFor(node) ?? (runRow?.status === "running" ? "not run yet" : "no record"),
        ms: null,
        costUsd: null,
        at: Infinity,
        runId: run.runId,
        nodeId: node.id,
        outcome: null,
        calls: [],
        entries: [],
        icon: node.icon,
      });
    }
    // Number the steps; a step's calls are n.1, n.2…
    let callNo = 0;
    for (const row of active) {
      if (row.kind === "call") {
        callNo += 1;
        row.number = `${n}.${callNo}`;
      } else {
        n += 1;
        callNo = 0;
        row.number = String(n);
      }
      rows.push(row);
    }
    for (const row of idle) {
      n += 1;
      row.number = String(n);
      rows.push(row);
    }
  }

  // Records the page saved (the created brand) close the story.
  for (const e of entries) {
    if (e.ref?.type !== "record") continue;
    n += 1;
    rows.push({
      id: `record:${e.key}`,
      kind: "record",
      number: String(n),
      title: e.label,
      detail: e.ref.table ? `${e.ref.table} ${e.ref.id}` : e.ref.id,
      status: "done",
      reason: null,
      ms: null,
      costUsd: null,
      at: e.firstAt,
      runId: null,
      nodeId: null,
      outcome: null,
      calls: [],
      entries: [e],
      icon: "database",
    });
  }
  return rows;
}

/** Every string leaf of a value with its path (`body.organic_results[3].link`). */
function* leaves(value: unknown, path: string, depth = 0): Generator<[string, string]> {
  if (depth > 12) return;
  if (typeof value === "string") {
    yield [path, value];
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) yield* leaves(value[i], `${path}[${i}]`, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) yield* leaves(v, path ? `${path}.${k}` : k, depth + 1);
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

/**
 * Where a derived value shows up in a raw response: the first string leaf equal to the value's
 * source URL or value (scheme, `www.` and trailing slash ignored). Null when it is not there.
 */
export function findInResponse(response: unknown, entry: BuilderEntry): string | null {
  const data = record(entry.data);
  const source = record(data.source);
  const wants = [source.url, data.url, data.value]
    .filter((v): v is string => typeof v === "string" && v.length > 3)
    .map(norm);
  if (!wants.length) return null;
  for (const [path, leaf] of leaves(response, "")) {
    if (leaf.length > 2000) continue;
    if (wants.includes(norm(leaf))) return path || "(root)";
  }
  return null;
}

/** The derived entries that came from this row's step. */
export function derivedFor(row: StoryRow, entries: BuilderEntry[]): BuilderEntry[] {
  if (!row.nodeId) return [];
  const fromStep = entries.filter((e) => e.group === "derived" && e.fromNodes?.includes(row.nodeId as string));
  if (row.kind !== "call") return fromStep;
  // One call row (Google, a lookup): only what this call's response holds or its engine found.
  const providers = new Set(row.calls.map((c) => c.provider.toLowerCase()));
  return fromStep.filter((e) => {
    const engines = record(e.data).engines;
    if (Array.isArray(engines) && engines.some((x) => typeof x === "string" && providers.has(x.toLowerCase()))) return true;
    return row.calls.some((c) => findInResponse(c.response, e) !== null);
  });
}
