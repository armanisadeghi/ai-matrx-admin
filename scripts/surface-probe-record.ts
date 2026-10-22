#!/usr/bin/env npx tsx
/**
 * surface-probe-record — the RECORD half of `scripts/surface-probe.mjs --record`.
 *
 * WHY (surface declarations W0-D, D2 + done bar (c)): readiness is EARNED from a
 * recorded passing check in `ui.ui_surface.last_check`, and the Surfaces admin
 * list (`ui.vw_surface_fleet_metric`) counts "supplied by probe" from
 * `last_check.suppliedValues`. Nothing wrote that, so probe supply read 0 on
 * every surface.
 *
 * Reads ONE probe result as JSON on stdin and writes it onto the surface's
 * `ui.ui_surface` row through the repo's privileged direct-Postgres path
 * (`connectDirect`, production guard on) — the same lane the manifest sync
 * writes `ui.*` with. It touches only `ui.ui_surface` (a system row), and only a
 * code-declared one: database-declared rows belong to an organization or a
 * person and are refused.
 *
 * Status (done bar (c)): `pass` when the probe signed in as the admin test
 * account, the page named the surface, and EVERY declared-on value that is
 * `always_available` (over the parent chain, nearest declaration wins — the
 * view's own rule) was supplied. Conditional (not always-available) values are
 * listed apart and never fail the probe.
 *
 * The write MERGES into `last_check`: a surface-check certification ledger
 * already there (sections S1–S18, `result`) is kept; the probe's keys replace
 * only themselves.
 *
 * Input (stdin): { surface, route, recordId, supplied[], suppliedEmpty[],
 *   surfaceNamed, signedIn, probedAs: { email, userId, role }, errors[], base }
 * Output (stdout): the object written, as JSON. Exit 0 written, 2 refused.
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

export const SURFACE_PROBE_VERSION = "surface-probe@2026-10-22.w0d";
/** The sanctioned test identity. A probe signed in as anyone else is never recorded. */
export const PROBE_IDENTITY = "admin@admin.com";

export interface ProbeRecordInput {
  surface: string;
  route: string;
  recordId: string | null;
  base: string;
  supplied: string[];
  suppliedEmpty: string[];
  /** A deployment without keyed rows: label + preview line per row ("Not available" = absent). */
  byLabel?: { label: string; line: string }[];
  surfaceNamed: boolean;
  signedIn: boolean;
  probedAs: { email: string | null; userId: string | null; role: string };
  errors: string[];
}

export interface ChainValue {
  name: string;
  label: string | null;
  always_available: boolean;
  auto_context: boolean | null;
}

export interface LastCheckProbe {
  status: "pass" | "fail";
  at: string;
  route: string;
  recordId: string | null;
  base: string;
  declaredOn: string[];
  required: string[];
  conditional: string[];
  suppliedValues: string[];
  suppliedEmpty: string[];
  readMode: "keys" | "labels";
  unmappedLabels: string[];
  missing: string[];
  conditionalMissing: string[];
  reasons: string[];
  probedAs: { email: string | null; userId: string | null; role: string };
  probeVersion: string;
}

/** Pure: the done-bar (c) verdict from the chain's values and what the page supplied. */
export function judgeProbe(input: ProbeRecordInput, chain: ChainValue[], at: string): LastCheckProbe {
  const declaredOn = chain.filter((v) => v.auto_context !== false).map((v) => v.name).sort();
  const required = chain
    .filter((v) => v.auto_context !== false && v.always_available)
    .map((v) => v.name)
    .sort();
  const conditional = declaredOn.filter((n) => !required.includes(n));
  const reasons: string[] = [];
  if (!input.signedIn) reasons.push("not signed in");
  if (!input.surfaceNamed) reasons.push(`the page on ${input.route} did not name ${input.surface}`);
  // A page that named a DIFFERENT surface supplied that surface's values, not
  // this one's: record nothing as supplied rather than credit the wrong row.
  const fromLabels: string[] = [];
  const emptyFromLabels: string[] = [];
  const unmappedLabels: string[] = [];
  const byLabel = input.byLabel ?? [];
  if (byLabel.length) {
    const nameByLabel = new Map<string, string>();
    for (const v of chain) {
      if (v.label) nameByLabel.set(v.label.trim().toLowerCase(), v.name);
      nameByLabel.set(v.name.toLowerCase(), v.name);
    }
    for (const row of byLabel) {
      if (row.line === "Not available") continue;
      const name = nameByLabel.get(row.label.trim().toLowerCase());
      if (!name) unmappedLabels.push(row.label);
      else if (row.line === "Empty") emptyFromLabels.push(name);
      else fromLabels.push(name);
    }
  }
  const emptyAll = [...input.suppliedEmpty, ...emptyFromLabels];
  const suppliedRaw = input.surfaceNamed
    ? [...new Set([...input.supplied, ...fromLabels, ...emptyAll])]
    : [];
  const supplied = new Set(suppliedRaw);
  const missing = required.filter((n) => !supplied.has(n));
  const conditionalMissing = conditional.filter((n) => !supplied.has(n));
  if (missing.length) reasons.push(`${missing.length} always-available value(s) not supplied`);
  if (declaredOn.length === 0) reasons.push("the surface declares no on values");
  return {
    status: reasons.length === 0 ? "pass" : "fail",
    at,
    route: input.route,
    recordId: input.recordId,
    base: input.base,
    declaredOn,
    required,
    conditional,
    suppliedValues: suppliedRaw.sort(),
    suppliedEmpty: input.surfaceNamed ? [...new Set(emptyAll)].sort() : [],
    readMode: byLabel.length ? "labels" : "keys",
    unmappedLabels,
    missing,
    conditionalMissing,
    reasons,
    probedAs: input.probedAs,
    probeVersion: SURFACE_PROBE_VERSION,
  };
}

const CHAIN_SQL = `
with recursive chain as (
  select s.name as ancestor_name, 0 as depth
    from ui.ui_surface s where s.name = $1 and s.deleted_at is null
  union all
  select p.parent_surface_name, c.depth + 1
    from chain c join ui.ui_surface p on p.name = c.ancestor_name and p.deleted_at is null
   where p.parent_surface_name is not null and p.parent_surface_name <> p.name and c.depth < 8
)
select distinct on (v.name) v.name, v.label, v.always_available, v.auto_context
  from chain c join ui.ui_surface_value v on v.surface_name = c.ancestor_name and v.deleted_at is null
 order by v.name, c.depth`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function refuse(message: string): never {
  console.error(`[surface-probe-record] REFUSED: ${message}`);
  process.exit(2);
}

async function main() {
  const input = JSON.parse(await readStdin()) as ProbeRecordInput;
  if (!input?.surface || !input.route) refuse("input needs surface and route");
  if (input.probedAs?.email !== PROBE_IDENTITY)
    refuse(`the probe was signed in as ${input.probedAs?.email ?? "nobody"}, not ${PROBE_IDENTITY}; nothing recorded`);
  const env = loadDbEnv();
  if ("missing" in env) refuse(`database variables missing: ${env.missing.join(", ")}`);
  const client = await connectDirect(env, "surface-probe-record");
  try {
    const row = await client.query<{ declared_by: string }>(
      "select declared_by from ui.ui_surface where name = $1 and deleted_at is null",
      [input.surface],
    );
    if (row.rowCount === 0) refuse(`no live ui.ui_surface row named ${input.surface}`);
    if (row.rows[0]!.declared_by !== "code")
      refuse(`${input.surface} is declared_by=${row.rows[0]!.declared_by}; only code-declared system rows are recorded`);
    const chain = await client.query<ChainValue>(CHAIN_SQL, [input.surface]);
    const at = new Date().toISOString();
    const probe = judgeProbe(input, chain.rows, at);
    await client.query(
      `update ui.ui_surface
          set last_check = coalesce(last_check, '{}'::jsonb) || $2::jsonb,
              last_checked_at = $3::timestamptz,
              last_checked_by = $4
        where name = $1 and deleted_at is null and declared_by = 'code'`,
      [input.surface, JSON.stringify(probe), at, `script:${SURFACE_PROBE_VERSION}`],
    );
    console.log(JSON.stringify(probe));
  } finally {
    await client.end();
  }
}

if (process.argv[1] && /surface-probe-record\.ts$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(`[surface-probe-record] ${error?.message ?? error}`);
    process.exit(2);
  });
}
