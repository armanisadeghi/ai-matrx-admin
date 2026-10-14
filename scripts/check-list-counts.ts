#!/usr/bin/env npx tsx
/**
 * LIST COUNTS ARE THE LIST, AND MY TEAM IS HONEST — the live guard (list-shell fix D, 2026-09-28).
 *
 * Reader for `public.__list_counts_conformance()`, which checks, IN THE CATALOG:
 *   counts_delegate_to_list        every *_list_counts / *_list_scope_counts whose *_list_scoped twin
 *                                  exists CALLS it — a tab count is its list query, so the two cannot
 *                                  drift (the flashcards/quizzes counts re-implemented the match and
 *                                  skipped "Shown to": 37 counted vs 36 listed).
 *   education_counts_equal_list    each flashcards/quizzes lane count equals its list total, for a
 *                                  sample of real people.
 *   team_reach_empty_without_team  iam.my_team_reach is EMPTY where the person is on no live team (it
 *                                  used to hold the person alone, so My team was a copy of Mine:
 *                                  quizzes 27 = 27, flashcards 186 = 186), and holds them where they are.
 *   my_teams_answers_every_person  public.my_teams (the My team tab's own read) answers every sampled
 *                                  person, across all organizations and for one they are not in, and
 *                                  shows each on-team person their team. RED on the old body
 *                                  (2026-09-30, clone, rolled back): 17 of 18 people refused with 42501
 *                                  because iam.team_ids_of ran on every team before the org narrowing.
 *
 * RED on the old definitions (run in a rolled-back transaction, 2026-09-28): counts_delegate_to_list
 * 2 offenders, team_reach_empty_without_team 18 offenders. GREEN after.
 *
 *   pnpm check:list-counts            # loud, exit 0
 *   pnpm check:list-counts:strict     # exit 1 on ANY finding or an UNMEASURED run
 *
 * UNMEASURED IS NOT PASSED — no credentials, an unreachable DB, an empty answer or a missing check
 * key prints LIVE PULL FAILED and fails --strict.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UNITS_RPC = "__list_counts_conformance_units";
const FAMILY_UNITS_RPC = "__list_counts_conformance_family_units";
const PROBE_RPC = "__list_counts_conformance_probe";
const TIMEOUT_MS = 12_000;
const TIMEOUT_RETRY_DELAY_MS = 1_000;
const STRICT = process.argv.includes("--strict");
const SELF_TEST = process.argv.includes("--self-test");

/**
 * The checks the deployed function is contracted to return. An absent key is a
 * finding in its own right — see the header.
 */
const EXPECTED_CHECKS = [
  "counts_delegate_to_list",
  "counts_are_security_invoker",
  "counts_family_registered",
  "education_counts_equal_list",
  "counts_equal_list_every_family",
  "team_reach_empty_without_team",
  "my_teams_answers_every_person",
] as const;

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const TAG = {
  info: `${C.cyan}[INFO]${C.reset} `,
  warn: `${C.yellow}[WARN]${C.reset} `,
  fail: `${C.red}[FAIL]${C.reset} `,
  ok: `${C.green}[ OK ]${C.reset} `,
};

interface ConformanceRow {
  readonly check_key: string;
  readonly ok: boolean;
  readonly severity?: string;
  readonly detail: Record<string, unknown> | null;
}

interface ProbeUnitRow {
  readonly unit: Record<string, unknown>;
}

/**
 * Same resolution order as check-hr-punch-write-path.ts, and for the same reason:
 * the secret key WINS over the publishable one regardless of file order, because
 * EXECUTE on this RPC is granted to authenticated and service_role and never to
 * anon — the publishable key answers 401 and the gate would report itself
 * UNMEASURED against a perfectly healthy database.
 */
function loadSupabaseEnv(): { url: string; key: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let key = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!url || !key) {
    let secret = "";
    for (const f of [".env.local", ".env.production.local", ".env.production", ".env"]) {
      const p = resolve(ROOT, f);
      if (!existsSync(p)) continue;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const v = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
        if (!url && m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
        if (!secret && m[1] === "SUPABASE_SECRET_KEY") secret = v;
      }
      if (url && secret) break;
    }
    if (!key) key = secret;
  }
  return url && key ? { url, key } : null;
}

function isRow(value: unknown): value is ConformanceRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.check_key === "string" && typeof r.ok === "boolean";
}

function isUnitRow(value: unknown): value is ProbeUnitRow {
  if (typeof value !== "object" || value === null) return false;
  const unit = (value as Record<string, unknown>).unit;
  return typeof unit === "object" && unit !== null && typeof (unit as Record<string, unknown>).kind === "string";
}

function describeUnit(unit: Record<string, unknown>, index: number): string {
  const kind = typeof unit.kind === "string" ? unit.kind : "unknown";
  const family = typeof unit.family === "string" ? `/${unit.family}` : "";
  const search = typeof unit.search === "string" ? "/search" : "";
  return `unit ${index + 1} (${kind}${family}${search})`;
}

type FetchProbe = (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>;

async function isPostgrestStatementTimeout(response: Response): Promise<boolean> {
  if (response.status !== 500) return false;
  try {
    const payload: unknown = await response.clone().json();
    return typeof payload === "object" && payload !== null
      && (payload as Record<string, unknown>).code === "57014";
  } catch {
    return false;
  }
}

async function fetchFullProbe(
  endpoint: string,
  init: RequestInit,
  label: string,
  fetchProbe: FetchProbe = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms)),
): Promise<Response> {
  const attempt = () => fetchProbe(endpoint, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const first = await attempt();
  if (!(await isPostgrestStatementTimeout(first))) return first;

  console.warn(
    `${TAG.warn}${label} hit SQLSTATE 57014; retrying the same full probe once after ${TIMEOUT_RETRY_DELAY_MS} ms`,
  );
  await wait(TIMEOUT_RETRY_DELAY_MS);
  return attempt();
}

async function runSelfTest(): Promise<number> {
  const timeout = () => new Response(
    JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
  const ok = () => new Response(JSON.stringify([{ check_key: "x", ok: true, detail: {} }]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  const init: RequestInit = { method: "POST", body: JSON.stringify({ p_unit: { kind: "family_lane" } }) };

  const successBodies: (BodyInit | null | undefined)[] = [];
  const successResponses = [timeout(), ok()];
  const success = await fetchFullProbe(
    "https://self.test/probe",
    init,
    "self-test unit",
    async (_input, request) => {
      successBodies.push(request?.body);
      return successResponses.shift() ?? ok();
    },
    async () => undefined,
  );
  if (!success.ok || successBodies.length !== 2 || successBodies[0] !== successBodies[1]) {
    throw new Error("57014 retry self-test did not repeat the identical full probe exactly once");
  }

  let failedCalls = 0;
  const failed = await fetchFullProbe(
    "https://self.test/probe",
    init,
    "self-test unit",
    async () => {
      failedCalls += 1;
      return timeout();
    },
    async () => undefined,
  );
  if (failedCalls !== 2 || !(await isPostgrestStatementTimeout(failed))) {
    throw new Error("second 57014 did not remain a strict failure after exactly one retry");
  }

  let semanticCalls = 0;
  const semantic = await fetchFullProbe(
    "https://self.test/probe",
    init,
    "self-test unit",
    async () => {
      semanticCalls += 1;
      return new Response(JSON.stringify({ code: "22023", message: "malformed unit" }), { status: 400 });
    },
    async () => undefined,
  );
  if (semanticCalls !== 1 || semantic.status !== 400) {
    throw new Error("a semantic failure was retried or accepted");
  }

  console.log(`${TAG.ok}list-count timeout retry self-test passed`);
  return 0;
}

function mergeDetails(
  left: Record<string, unknown> | null,
  right: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!left) return right;
  if (!right) return left;
  const out: Record<string, unknown> = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (key === "why") continue;
    if (key === "checked" || key === "lane_totals_compared") {
      out[key] = Number(out[key] ?? 0) + Number(value ?? 0);
      continue;
    }
    if (Array.isArray(value)) {
      const combined = [...(Array.isArray(out[key]) ? out[key] : []), ...value];
      out[key] = key === "no_list_twin_not_compared"
        ? [...new Set(combined.map((item) => JSON.stringify(item)))].map((item) => JSON.parse(item) as unknown)
        : combined;
      continue;
    }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

function aggregateRows(rows: readonly ConformanceRow[]): ConformanceRow[] {
  const byKey = new Map<string, ConformanceRow>();
  for (const row of rows) {
    const current = byKey.get(row.check_key);
    if (!current) {
      byKey.set(row.check_key, row);
      continue;
    }
    byKey.set(row.check_key, {
      check_key: row.check_key,
      ok: current.ok && row.ok,
      severity: current.severity ?? row.severity,
      detail: mergeDetails(current.detail, row.detail),
    });
  }
  return [...byKey.values()];
}

async function fetchConformance(): Promise<
  { rows: ConformanceRow[]; failure: null } | { rows: null; failure: string }
> {
  const env = loadSupabaseEnv();
  if (!env) return { rows: null, failure: "no Supabase URL/secret key in env or .env* files" };

  const base = `${env.url.replace(/\/$/, "")}/rest/v1/rpc`;
  const headers = {
    apikey: env.key,
    Authorization: `Bearer ${env.key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Content-Profile": "platform",
    "Accept-Profile": "platform",
  };
  try {
    const manifest = await fetch(`${base}/${UNITS_RPC}`, {
      method: "POST",
      headers,
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!manifest.ok) {
      return {
        rows: null,
        failure: `rpc/${UNITS_RPC} returned ${manifest.status}: ${(await manifest.text()).slice(0, 300)}`,
      };
    }
    const unitsValue: unknown = JSON.parse(await manifest.text());
    if (!Array.isArray(unitsValue) || !unitsValue.every(isUnitRow)) {
      return { rows: null, failure: `rpc/${UNITS_RPC} did not return [{unit:{kind,...}}]` };
    }
    if (unitsValue.length === 0) {
      return { rows: null, failure: `rpc/${UNITS_RPC} returned zero units — it measured nothing` };
    }

    const probeUnits: ProbeUnitRow[] = [];
    for (const [index, { unit }] of unitsValue.entries()) {
      if (unit.kind !== "family") {
        probeUnits.push({ unit });
        continue;
      }
      if (unit.empty === true) {
        probeUnits.push({ unit: { ...unit, kind: "family_lane" } });
        continue;
      }
      const expansion = await fetch(`${base}/${FAMILY_UNITS_RPC}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_unit: unit }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!expansion.ok) {
        return {
          rows: null,
          failure: `rpc/${FAMILY_UNITS_RPC} ${describeUnit(unit, index)} returned ${expansion.status}: ${(await expansion.text()).slice(0, 300)}`,
        };
      }
      const expanded: unknown = JSON.parse(await expansion.text());
      if (!Array.isArray(expanded) || !expanded.every(isUnitRow) || expanded.length === 0) {
        return { rows: null, failure: `rpc/${FAMILY_UNITS_RPC} ${describeUnit(unit, index)} returned no lane units` };
      }
      probeUnits.push(...expanded);
    }

    const partialRows: ConformanceRow[] = [];
    for (const [index, { unit }] of probeUnits.entries()) {
      const label = describeUnit(unit, index);
      const res = await fetchFullProbe(`${base}/${PROBE_RPC}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_unit: unit }),
      }, label);
      if (!res.ok) {
        return {
          rows: null,
          failure: `rpc/${PROBE_RPC} ${label} returned ${res.status}: ${(await res.text()).slice(0, 300)}`,
        };
      }
      const parsed: unknown = JSON.parse(await res.text());
      if (!Array.isArray(parsed) || !parsed.every(isRow) || parsed.length === 0) {
        return { rows: null, failure: `rpc/${PROBE_RPC} ${describeUnit(unit, index)} returned no valid check rows` };
      }
      partialRows.push(...parsed);
    }
    return { rows: aggregateRows(partialRows), failure: null };
  } catch (err) {
    return {
      rows: null,
      failure: `could not complete bounded list-count probes (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

function renderDetail(detail: Record<string, unknown> | null): string[] {
  if (!detail) return [];
  const lines: string[] = [];
  const why = detail.why;
  if (typeof why === "string" && why.trim()) lines.push(`${C.dim}${why.trim()}${C.reset}`);
  for (const [k, v] of Object.entries(detail)) {
    if (k === "why") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}: ${v.map((i) => JSON.stringify(i)).join(", ")}`);
    } else if (v !== null && v !== undefined && v !== "") {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  return lines;
}

function unmeasured(reason: string): never {
  console.log("");
  console.log(
    `${TAG.warn}${C.bold}${C.yellow}LIVE PULL FAILED — list counts and My team are UNMEASURED${C.reset}`,
  );
  console.log(`  ${C.dim}${reason}${C.reset}`);
  console.log(
    `  ${C.dim}Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY. Nothing was checked — that is NOT a pass.${C.reset}`,
  );
  console.log("");
  exitAfterDrain(STRICT ? 1 : 0);
}

async function main(): Promise<number> {
  const result = await fetchConformance();
  if (result.rows === null) unmeasured(result.failure);

  const rows = result.rows;
  if (rows.length === 0) {
    unmeasured(`bounded list-count probes returned zero rows — they measured nothing`);
  }

  const byKey = new Map(rows.map((r) => [r.check_key, r]));
  const missing = EXPECTED_CHECKS.filter((k) => !byKey.has(k));
  const failed = rows.filter((r) => !r.ok);

  console.log("");
  console.log(
    `${C.bold}List counts are the list · My team is honest${C.reset} ${C.dim}(bounded service probes)${C.reset}`,
  );

  for (const key of EXPECTED_CHECKS) {
    const row = byKey.get(key);
    if (!row) {
      console.log(`  ${TAG.fail}${key} ${C.dim}— NOT RETURNED by the function${C.reset}`);
      continue;
    }
    if (row.ok) {
      console.log(`  ${TAG.ok}${key}`);
      continue;
    }
    console.log(`  ${TAG.fail}${key}`);
    for (const line of renderDetail(row.detail)) console.log(`        ${line}`);
  }

  // A key the function returns that this file does not know about is not a
  // failure — it is a new check whose key belongs in EXPECTED_CHECKS.
  for (const r of rows) {
    if (!EXPECTED_CHECKS.includes(r.check_key as (typeof EXPECTED_CHECKS)[number])) {
      console.log(
        `  ${TAG.info}unlisted  ${r.check_key} ${C.dim}— add it to EXPECTED_CHECKS in scripts/check-list-counts.ts${C.reset}`,
      );
    }
  }

  console.log("");
  if (failed.length === 0 && missing.length === 0) {
    console.log(
      `${TAG.ok}Every list count is its list query, and My team is empty for people on no team.`,
    );
    console.log("");
    return 0;
  }

  console.log(
    `${TAG.fail}${C.bold}${C.red}LIST COUNTS / MY TEAM NOT CONFORMANT — ${failed.length} failing check(s), ${missing.length} missing check(s)${C.reset}`,
  );
  console.log(
    `  ${C.dim}Fix the named function: a count calls its *_list_scoped twin; iam.my_team_reach skips organizations where the person is on no team.${C.reset}`,
  );
  console.log("");
  return STRICT ? 1 : 0;
}

const entrypoint = SELF_TEST ? runSelfTest : main;

entrypoint().then(
  (code) => exitAfterDrain(code),
  (err) => {
    console.error(`${TAG.fail}check-list-counts crashed:`, err);
    exitAfterDrain(2);
  },
);
