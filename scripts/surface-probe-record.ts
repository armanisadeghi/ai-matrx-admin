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
 * Status `inconclusive` (2026-10-22) when the page refused access or loaded nothing; it never
 * overwrites a recorded pass or fail (`lastCheckPatch`).
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
 * Values (W5-B): `last_check.values` holds what the page showed for each supplied
 * value — the preview line, cut to PROBE_VALUE_MAX_CHARS — so the per-surface admin
 * page renders the situation with real values. Only the admin test account's probe
 * is ever recorded (refused below otherwise), so these are test-record values.
 *
 * Input (stdin): { surface, route, recordId, supplied[], suppliedEmpty[], values{},
 *   surfaceNamed, signedIn, probedAs: { email, userId, role }, errors[], base }
 * Output (stdout): the object written, as JSON. Exit 0 written, 2 refused.
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

export {
  CHAIN_SQL,
  judgeProbe,
  PROBE_IDENTITY,
  PROBE_VALUE_MAX_CHARS,
  SURFACE_PROBE_VERSION,
} from "./lib/surface-probe-judge";
export type { ChainValue, LastCheckProbe, ProbeRecordInput } from "./lib/surface-probe-judge";
import {
  CHAIN_SQL,
  judgeProbe,
  lastCheckPatch,
  PROBE_IDENTITY,
  SURFACE_PROBE_VERSION,
  type ChainValue,
  type ProbeRecordInput,
} from "./lib/surface-probe-judge";

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
    const row = await client.query<{ declared_by: string; status: string | null }>(
      "select declared_by, last_check->>'status' as status from ui.ui_surface where name = $1 and deleted_at is null",
      [input.surface],
    );
    if (row.rowCount === 0) refuse(`no live ui.ui_surface row named ${input.surface}`);
    if (row.rows[0]!.declared_by !== "code")
      refuse(`${input.surface} is declared_by=${row.rows[0]!.declared_by}; only code-declared system rows are recorded`);
    const chain = await client.query<ChainValue>(CHAIN_SQL, [input.surface]);
    const at = new Date().toISOString();
    const probe = judgeProbe(input, chain.rows, at);
    // An inconclusive probe never overwrites a recorded pass or fail (lastCheckPatch).
    const patch = lastCheckPatch(row.rows[0]!.status, probe);
    await client.query(
      `update ui.ui_surface
          set last_check = coalesce(last_check, '{}'::jsonb) || $2::jsonb,
              last_checked_at = $3::timestamptz,
              last_checked_by = $4
        where name = $1 and deleted_at is null and declared_by = 'code'`,
      [input.surface, JSON.stringify(patch), at, `script:${SURFACE_PROBE_VERSION}`],
    );
    console.log(JSON.stringify({ ...probe, kept: "lastInconclusive" in patch && !("status" in patch) ? row.rows[0]!.status : undefined }));
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
