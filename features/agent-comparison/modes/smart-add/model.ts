/**
 * Smart Add truth bench — pure logic (FEATURE.md beside this file).
 *
 * A person names a brand they know; the bench casts a wide net (Google + Brave, several queries,
 * several pages), sends every unique result to today's Smart Add holder (in batches of 25, as
 * production does), to its Jev decision agent (one result per call) and optionally to today's
 * holder on a reference model, then the person marks the truth for each result, blind.
 * Every number on the scoreboard is measured against that truth, never against confidence.
 */

import type { MatrixCell, MatrixCellResult, MatrixPatch, MatrixSetup, MatrixVariant } from "../matrix/types";

/** Production batch size for the holder (`web_classifier_provision.CALL_BATCH`). */
export const HOLDER_BATCH = 25;

export const BENCH_KEY = "smart_add_bench" as const;

export type Truth = "ours" | "about_us" | "not_us";
export type Stance = Truth | "cant_tell";
export type SystemKey = "holder" | "jev" | "reference";
export type Engine = "google" | "brave";

export const TRUTH_LABEL: Record<Stance, string> = {
  ours: "Ours",
  about_us: "About us",
  not_us: "Not us",
  cant_tell: "Can't tell",
};

export const SYSTEM_LABEL: Record<SystemKey, string> = {
  holder: "Today's AI",
  jev: "Jev",
  reference: "Reference",
};

export interface BenchBrand {
  website: string;
  name: string;
  place: string;
  /** Accounts the person knows are theirs, one per line (optional). */
  accounts: string;
}

export interface BenchHit {
  engine: Engine;
  query: string;
  rank: number;
}

export interface BenchResult {
  /** Row id: the normalized address. */
  key: string;
  url: string;
  title: string;
  description: string;
  extraSnippets: string[];
  hits: BenchHit[];
}

export interface RelationKind {
  key: string;
  label: string | null;
  stance: string | null;
  has_sentiment: boolean | null;
  description: string | null;
}

/**
 * Who judged, recorded on the bench at run time: today's holder is whatever agent holds the
 * mandate `brand_intake.web_result_classifier` then; Jev is its decision agent (found by its tags);
 * the reference model is the person's pick. Never constants in code.
 */
export interface BenchAgents {
  holder: string | null;
  jev: string | null;
  referenceModel: string | null;
}

export interface BenchState {
  brand: BenchBrand;
  queries: string[];
  pages: number;
  results: BenchResult[];
  /** stance by relation key, frozen at run time (the holder's labels → ours / about us / not us). */
  stances: Record<string, string>;
  systems: SystemKey[];
  truth: Record<string, Truth>;
  agents: BenchAgents;
  ranAt?: string | null;
}

// ---------------------------------------------------------------------------
// The net
// ---------------------------------------------------------------------------

export function domainOf(website: string): string {
  const raw = website.trim();
  if (!raw) return "";
  try {
    return new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

/** The default queries: the name, the name in its place, the domain, and the name on social and review sites. */
export function defaultQueries(brand: BenchBrand): string[] {
  const name = brand.name.trim();
  const place = brand.place.trim();
  const domain = domainOf(brand.website);
  const out: string[] = [];
  if (name) out.push(`"${name}"`);
  if (name && place) out.push(`"${name}" ${place}`);
  if (domain) out.push(domain);
  if (name) out.push(`"${name}" instagram OR facebook OR tiktok OR linkedin`);
  if (name) out.push(`"${name}" reviews`);
  return [...new Set(out)];
}

/** One address per result: no scheme, no www., no trailing slash, no tracking query. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|srsltid)/i.test(p)) u.searchParams.delete(p);
    }
    const q = u.searchParams.toString();
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${path}${q ? `?${q}` : ""}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Raw rows from one engine call (Brave or Google, any field spelling) → results. */
export function readEngineRows(result: unknown): { url: string; title: string; description: string; extra: string[] }[] {
  const r = (result && typeof result === "object" ? result : {}) as Record<string, unknown>;
  const list = (Array.isArray(r.results) ? r.results : Array.isArray(r.items) ? r.items : []) as Record<string, unknown>[];
  return list
    .map((x) => ({
      url: String(x.url ?? x.link ?? ""),
      title: String(x.title ?? ""),
      description: String(x.snippet ?? x.description ?? ""),
      extra: Array.isArray(x.extra_snippets) ? x.extra_snippets.map(String) : [],
    }))
    .filter((x) => /^https?:\/\//i.test(x.url));
}

/** Merge every engine call into unique results, first sighting first; every sighting kept as a hit. */
export function mergeResults(
  calls: { engine: Engine; query: string; page: number; pageSize: number; result: unknown }[],
): BenchResult[] {
  const byKey = new Map<string, BenchResult>();
  for (const call of calls) {
    readEngineRows(call.result).forEach((row, i) => {
      const key = normalizeUrl(row.url);
      const hit: BenchHit = { engine: call.engine, query: call.query, rank: (call.page - 1) * call.pageSize + i + 1 };
      const seen = byKey.get(key);
      if (seen) {
        seen.hits.push(hit);
        if (!seen.description && row.description) seen.description = row.description;
        return;
      }
      byKey.set(key, { key, url: row.url, title: row.title, description: row.description, extraSnippets: row.extra, hits: [hit] });
    });
  }
  return [...byKey.values()];
}

// ---------------------------------------------------------------------------
// What each system is given (the holder's framing, from web_classifier_provision.py)
// ---------------------------------------------------------------------------

function accountLines(brand: BenchBrand): string[] {
  return brand.accounts.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

export function knownFactsText(brand: BenchBrand): string {
  const lines = ["Confirmed by the person:"];
  if (brand.name.trim()) lines.push(`- name: ${brand.name.trim()}`);
  if (domainOf(brand.website)) lines.push(`- domain: ${domainOf(brand.website)}`);
  if (brand.place.trim()) lines.push(`- location: ${brand.place.trim()}`);
  const accounts = accountLines(brand);
  if (accounts.length) lines.push(`- links: ${JSON.stringify(accounts)}`);
  return lines.length > 1 ? lines.join("\n") : "[NONE]";
}

export function confirmedIdentityText(brand: BenchBrand): string {
  const domain = domainOf(brand.website);
  const accounts = accountLines(brand);
  return [
    `Website confirmed as ours:\n${domain || "[NONE]"}`,
    `Accounts decided as ours:\n${accounts.length ? JSON.stringify(accounts) : "[NONE]"}`,
    `Our name (confirmed):\n${brand.name.trim() || "[NONE]"}`,
  ].join("\n\n");
}

export function brandContextText(brand: BenchBrand): string {
  return [
    `What we know so far:\n${knownFactsText(brand)}`,
    `What's confirmed as ours:\n${confirmedIdentityText(brand)}`,
    "What I've said is NOT us:\n[NONE]",
  ].join("\n\n");
}

export function relationKindsText(kinds: RelationKind[]): string {
  return kinds
    .map((k) => {
      const tail = k.has_sentiment ? " [sentiment]" : "";
      const meaning = k.description ? ` — ${k.description}` : "";
      return `- ${k.key}: ${k.label || k.key} (${k.stance || "?"})${tail}${meaning}`;
    })
    .join("\n");
}

/** The one result as every system sees it: the same fields, nothing computed on top. */
export function itemOf(r: BenchResult): Record<string, unknown> {
  const best = r.hits[0];
  return {
    url: r.url,
    title: r.title,
    description: r.description,
    ...(r.extraSnippets.length ? { extra_snippets: r.extraSnippets } : {}),
    engine: best?.engine,
    rank: best?.rank,
    query: best?.query,
  };
}

// ---------------------------------------------------------------------------
// The matrix: item rows run Jev; batch rows run the holder (and the reference)
// ---------------------------------------------------------------------------

export const COLUMN_ID: Record<SystemKey, string> = { holder: "holder", jev: "jev", reference: "reference" };
export const BATCH_ROW_PREFIX = "batch:";

export function batchesOf(results: BenchResult[]): BenchResult[][] {
  const out: BenchResult[][] = [];
  for (let i = 0; i < results.length; i += HOLDER_BATCH) out.push(results.slice(i, i + HOLDER_BATCH));
  return out;
}

export function buildSetup(bench: BenchState, kinds: RelationKind[]): MatrixSetup {
  const brand = bench.brand;
  const holderVars = {
    known_facts: knownFactsText(brand),
    confirmed_identity: confirmedIdentityText(brand),
    exclusions: "[NONE]",
    relation_kinds: relationKindsText(kinds),
  };
  const itemRows: MatrixVariant[] = bench.results.map((r) => ({
    id: r.key,
    label: r.url,
    patch: { variables: { brand_context: brandContextText(brand), item: JSON.stringify(itemOf(r)) } },
  }));
  const batchRows: MatrixVariant[] = batchesOf(bench.results).map((batch, i) => ({
    id: `${BATCH_ROW_PREFIX}${i}`,
    label: `Batch ${i + 1} (${batch.length} results)`,
    patch: { variables: { ...holderVars, results: JSON.stringify({ items: batch.map(itemOf) }) } },
  }));
  const { holder, jev, referenceModel } = bench.agents;
  const columns: MatrixVariant[] = [];
  if (holder) columns.push({ id: COLUMN_ID.holder, label: SYSTEM_LABEL.holder, patch: { agent_id: holder } });
  if (jev) columns.push({ id: COLUMN_ID.jev, label: SYSTEM_LABEL.jev, patch: { agent_id: jev } });
  if (holder && referenceModel) {
    columns.push({
      id: COLUMN_ID.reference,
      label: SYSTEM_LABEL.reference,
      patch: { agent_id: holder, model_id: referenceModel } satisfies MatrixPatch,
    });
  }
  return {
    schema_version: 1,
    base: {},
    rows: { label: "Results", variants: [...itemRows, ...batchRows] },
    columns: { label: "Systems", variants: columns },
    repeats: 1,
  };
}

/**
 * The cells a run needs: Jev on every result, the holder (and the reference) on every batch.
 * The slow batch calls queue first, so they run beside Jev instead of after it.
 */
export function cellsToRun(setup: MatrixSetup, systems: SystemKey[]): { row_id: string; column_id: string; repeat: number }[] {
  const out: { row_id: string; column_id: string; repeat: number }[] = [];
  const rows = [...setup.rows.variants].sort(
    (a, b) => Number(b.id.startsWith(BATCH_ROW_PREFIX)) - Number(a.id.startsWith(BATCH_ROW_PREFIX)),
  );
  const present = new Set(setup.columns.variants.map((c) => c.id));
  for (const row of rows) {
    const batch = row.id.startsWith(BATCH_ROW_PREFIX);
    for (const s of systems) {
      if (!present.has(COLUMN_ID[s])) continue;
      if ((s === "jev") !== batch) out.push({ row_id: row.id, column_id: COLUMN_ID[s], repeat: 0 });
    }
  }
  return out;
}

/**
 * How many cells a bench's run makes: Jev on every result, the holder (and the reference, when a
 * model was picked) on every batch. The page keeps reading until this many exist — the run queues
 * them a moment after the page has already moved to the bench, so "none yet" is not "done".
 */
export function expectedCells(bench: BenchState): number {
  const { holder, jev, referenceModel } = bench.agents;
  const batches = batchesOf(bench.results).length;
  let n = 0;
  if (jev && bench.systems.includes("jev")) n += bench.results.length;
  if (holder && bench.systems.includes("holder")) n += batches;
  if (holder && referenceModel && bench.systems.includes("reference")) n += batches;
  return n;
}

// ---------------------------------------------------------------------------
// Reading answers
// ---------------------------------------------------------------------------

function parseJson(text: string | undefined | null): unknown {
  if (!text) return null;
  const body = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function stanceOfKind(kind: string | null | undefined, stances: Record<string, string>): Stance {
  if (!kind || kind === "needs_person" || kind === "maybe") return "cant_tell";
  const s = stances[kind];
  if (s === "ours") return "ours";
  if (s === "associated" || s === "about_us") return "about_us";
  if (s === "competitor" || s === "not_us" || s === "irrelevant") return "not_us";
  return "cant_tell";
}

export interface SystemAnswer {
  stance: Stance;
  /** The system's own label (a relation key, or Jev's stance key). */
  label: string | null;
  probability: number | null;
}

/** Jev's answer from its cell: the `stance` question decides; `kind` is shown beside it. */
export function readJevCell(answer: string | undefined): SystemAnswer | null {
  const parsed = parseJson(answer) as { answers?: Record<string, { answer?: unknown; probabilities?: Record<string, number> }> } | null;
  const stance = parsed?.answers?.stance;
  if (!stance) return null;
  const key = String(stance.answer ?? "");
  const kind = parsed?.answers?.kind?.answer;
  return {
    stance: key === "ours" || key === "about_us" || key === "not_us" ? key : "cant_tell",
    label: typeof kind === "string" ? kind : null,
    probability: stance.probabilities?.[key] ?? null,
  };
}

/** One batch cell (holder or reference) → its answer per result url. */
export function readBatchCell(answer: string | undefined, stances: Record<string, string>): Map<string, SystemAnswer> {
  const parsed = parseJson(answer) as { results?: { url?: string; kind?: string; probability?: number }[] } | null;
  const out = new Map<string, SystemAnswer>();
  for (const r of parsed?.results ?? []) {
    if (!r?.url) continue;
    out.set(normalizeUrl(r.url), {
      stance: stanceOfKind(r.kind, stances),
      label: r.kind ?? null,
      probability: typeof r.probability === "number" ? r.probability : null,
    });
  }
  return out;
}

export interface SystemRun {
  answers: Map<string, SystemAnswer>;
  /** Wall time per call, ms (Jev: one per result; holder/reference: one per batch). */
  durations: number[];
  cost: number;
  calls: number;
  done: number;
  failed: number;
  /** The Jev cell's conversation per result (for labelling its answer). */
  conversations: Map<string, string>;
}

/**
 * Every system's answers, timings and costs from the battle's cells. `jevStore` holds Jev's
 * answers read from the decision answer store by run conversation, for cells whose own answer
 * text is empty (a decision turn has no text).
 */
export function readRuns(
  cells: MatrixCell[],
  bench: BenchState,
  jevStore: Map<string, SystemAnswer> = new Map(),
): Record<SystemKey, SystemRun> {
  const empty = (): SystemRun => ({ answers: new Map(), durations: [], cost: 0, calls: 0, done: 0, failed: 0, conversations: new Map() });
  const runs: Record<SystemKey, SystemRun> = { holder: empty(), jev: empty(), reference: empty() };
  for (const cell of cells) {
    const system = (Object.keys(COLUMN_ID) as SystemKey[]).find((k) => COLUMN_ID[k] === cell.columnId);
    if (!system) continue;
    const batch = cell.rowId.startsWith(BATCH_ROW_PREFIX);
    if ((system === "jev") === batch) continue;
    const run = runs[system];
    run.calls += 1;
    if (cell.status === "failed" || cell.status === "cancelled") run.failed += 1;
    if (cell.status !== "completed" || !cell.result) continue;
    run.done += 1;
    if (typeof cell.result.duration_ms === "number") run.durations.push(cell.result.duration_ms);
    if (typeof cell.result.cost === "number") run.cost += cell.result.cost;
    if (system === "jev") {
      const a = readJevCell(cell.result.answer) ?? jevStore.get(cell.conversationId) ?? null;
      if (a) run.answers.set(cell.rowId, a);
      run.conversations.set(cell.rowId, cell.conversationId);
    } else {
      for (const [k, a] of readBatchCell(cell.result.answer, bench.stances)) run.answers.set(k, a);
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------
// The scoreboard — against the person's truth only
// ---------------------------------------------------------------------------

export interface Score {
  marked: number;
  right: number;
  wrong: number;
  cantTell: number;
  missing: number;
  /** Said ours when it is not: a stranger's page attached to the brand. */
  falseOurs: number;
  /** Said not us when it is ours or about us: the brand's own presence thrown away. */
  missedUs: number;
  p50: number | null;
  p90: number | null;
  cost: number;
  calls: number;
}

function pct(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

export function score(run: SystemRun, truth: Record<string, Truth>): Score {
  const out: Score = { marked: 0, right: 0, wrong: 0, cantTell: 0, missing: 0, falseOurs: 0, missedUs: 0,
    p50: pct(run.durations, 0.5), p90: pct(run.durations, 0.9), cost: run.cost, calls: run.calls };
  for (const [key, t] of Object.entries(truth)) {
    out.marked += 1;
    const a = run.answers.get(key);
    if (!a) out.missing += 1;
    else if (a.stance === "cant_tell") out.cantTell += 1;
    else if (a.stance === t) out.right += 1;
    else {
      out.wrong += 1;
      if (a.stance === "ours") out.falseOurs += 1;
      if (a.stance === "not_us") out.missedUs += 1;
    }
  }
  return out;
}

export function emptyBench(): BenchState {
  return { brand: { website: "", name: "", place: "", accounts: "" }, queries: [], pages: 2, results: [], stances: {},
    systems: ["holder", "jev"], truth: {}, agents: { holder: null, jev: null, referenceModel: null }, ranAt: null };
}

export function readBench(metadata: Record<string, unknown> | null | undefined): BenchState | null {
  const raw = metadata?.[BENCH_KEY];
  if (!raw || typeof raw !== "object") return null;
  return { ...emptyBench(), ...(raw as Partial<BenchState>) };
}

// ---------------------------------------------------------------------------
// Live run: placeholder cells, events applied as they stream, per-row status
// ---------------------------------------------------------------------------

/** Every cell the run will make, as Waiting — shown the moment the person clicks Judge. */
export function placeholderCells(refs: { row_id: string; column_id: string; repeat: number }[]): MatrixCell[] {
  return refs.map((r) => ({
    entryId: `pending:${r.row_id}:${r.column_id}`,
    conversationId: "",
    rowId: r.row_id,
    columnId: r.column_id,
    repeat: r.repeat,
    status: "queued",
    stalled: false,
    attempt: 1,
    startedAt: null,
    finishedAt: null,
    error: null,
    request: null,
    result: null,
    history: [],
  }));
}

type LiveEvent =
  | { type: "matrix_battle_cell_started"; entry_id: string; row_id: string; column_id: string; conversation_id: string }
  | {
      type: "matrix_battle_cell_finished";
      entry_id: string;
      row_id: string;
      column_id: string;
      status: string;
      error?: string | null;
      conversation_id?: string | null;
      result?: MatrixCellResult | null;
    }
  | { type: "matrix_battle_finished"; counts: Record<string, number> };

/** One streamed event applied to the cells (pure; unknown cells are added). */
export function applyRunEvent(cells: MatrixCell[], e: LiveEvent, now: string): MatrixCell[] {
  if (e.type === "matrix_battle_finished") return cells;
  const i = cells.findIndex((c) => c.rowId === e.row_id && c.columnId === e.column_id);
  const base: MatrixCell = i >= 0 ? cells[i] : placeholderCells([{ row_id: e.row_id, column_id: e.column_id, repeat: 0 }])[0];
  const next: MatrixCell =
    e.type === "matrix_battle_cell_started"
      ? { ...base, entryId: e.entry_id, conversationId: e.conversation_id, status: "running", startedAt: now }
      : {
          ...base,
          entryId: e.entry_id,
          conversationId: e.conversation_id ?? base.conversationId,
          status: (["completed", "failed", "cancelled"].includes(e.status) ? e.status : "failed") as MatrixCell["status"],
          error: e.error ?? null,
          result: e.result ?? null,
          finishedAt: now,
        };
  const out = [...cells];
  if (i >= 0) out[i] = next;
  else out.push(next);
  return out;
}

export type RowStatus = "idle" | "waiting" | "judging" | "done" | "failed";

/** Where one result stands with one system: Jev by its own cell, the batch systems by its batch's cell. */
export function rowStatus(cells: MatrixCell[], bench: BenchState, key: string, system: SystemKey): RowStatus {
  let rowId = key;
  if (system !== "jev") {
    const index = bench.results.findIndex((r) => r.key === key);
    if (index < 0) return "idle";
    rowId = `${BATCH_ROW_PREFIX}${Math.floor(index / HOLDER_BATCH)}`;
  }
  const cell = cells.find((c) => c.rowId === rowId && c.columnId === COLUMN_ID[system]);
  if (!cell) return "idle";
  if (cell.status === "completed") return "done";
  if (cell.status === "failed" || cell.status === "cancelled" || cell.stalled) return "failed";
  return cell.status === "running" ? "judging" : "waiting";
}
