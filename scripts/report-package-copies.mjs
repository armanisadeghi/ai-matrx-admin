#!/usr/bin/env node
/**
 * report-package-copies.mjs — the numbers behind the attention-dock source "Package copies in apps".
 *
 * Package rules are enforced at the package's RELEASE; the apps get a report, never a gate
 * (typescript-package-standard rule 13). This writes the report the dock reads:
 *   twins        local definitions of logic a package already owns, plus the censused ones still to collapse
 *                (scripts/check-package-twins.mjs — the output is parsed, that script has no JSON mode)
 *   dbCalls      direct database calls outside @ai-matrx/data (aidream check-db-doors.mjs --json)
 *   deepImports  imports of a package subpath its `exports` map does not declare
 *                (aidream check-package-rules.mjs --apps --json)
 *
 *   node scripts/report-package-copies.mjs            rewrite features/admin/attention/sources/package-copies.report.json
 *   node scripts/report-package-copies.mjs --stdout   print instead of writing
 *   node scripts/report-package-copies.mjs --self-test
 * Exit code is always 0 for a report; a probe that cannot run is written as `null`, never as zero.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "features/admin/attention/sources/package-copies.report.json");
const SHARED_SCRIPTS = resolve(ROOT, "../aidream/apps/shared/scripts");

/** Pull the counts out of check-package-twins' prose. Exported for the self-test. */
export function parseTwins(stdout, stderr) {
  const open = /(\d+) re-grown twin\(s\)/.exec(stderr)?.[1];
  const census = [...stdout.matchAll(/CENSUS: (\d+) pre-existing/g)].reduce((n, m) => n + Number(m[1]), 0);
  const ok = /check:package-twins OK/.test(stdout);
  if (open === undefined && !ok) return null;
  return { open: Number(open ?? 0), census };
}

function probe(cmd, args, cwd = ROOT) {
  const r = spawnSync(process.execPath, [cmd, ...args], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60_000 });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", status: r.status };
}

function build() {
  const twinsRun = probe("scripts/check-package-twins.mjs", []);
  const twins = parseTwins(twinsRun.stdout, twinsRun.stderr);
  let db = null;
  const dbRun = probe(join(SHARED_SCRIPTS, "check-db-doors.mjs"), ["--repo", "matrx-frontend", "--json"]);
  try { const j = JSON.parse(dbRun.stdout); db = { calls: j.total, files: j.files }; } catch { /* stays null */ }
  let deep = null;
  const deepRun = probe(join(SHARED_SCRIPTS, "check-package-rules.mjs"), ["--apps", "--json"]);
  try {
    const rows = JSON.parse(deepRun.stdout);
    const mine = rows.find((r) => r.app === "matrx-frontend");
    deep = { subpaths: mine?.subpaths ?? 0, files: mine?.files ?? 0, examples: Object.keys(mine?.specs ?? {}).slice(0, 5) };
  } catch { /* stays null */ }
  return { generatedAt: new Date().toISOString(), apps: { "matrx-frontend": { twins, db, deep } } };
}

function selfTest() {
  const bad = parseTwins("", "check:package-twins: 3 re-grown twin(s) of logic that lives in an @ai-matrx package:");
  const ok = parseTwins("check:package-twins CENSUS: 4 pre-existing definition(s)\ncheck:package-twins [SHAPE/uuid] CENSUS: 2 pre-existing file(s)\ncheck:package-twins OK — 9 files", "");
  const unknown = parseTwins("", "boom");
  const fails = [];
  if (bad?.open !== 3) fails.push("open twins not parsed");
  if (ok?.census !== 6 || ok.open !== 0) fails.push("census not summed");
  if (unknown !== null) fails.push("an unreadable run must be null, not zero");
  if (fails.length) { console.error(`SELF-TEST FAILED: ${fails.join("; ")}`); process.exit(1); }
  console.log("report-package-copies self-test: twin counts parsed, an unreadable probe is null");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--self-test")) selfTest();
  else {
    const report = build();
    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (process.argv.includes("--stdout")) process.stdout.write(text);
    else { writeFileSync(OUT, text); console.log(`wrote ${OUT}`); }
  }
}
