#!/usr/bin/env node
// THE PUBLISH-LAG ALARM, from the consumer's side (2026-10-15). The check lives once, in the
// publisher: ../aidream/scripts/check-npm-publish-lag.mjs (git + the npm registry + `gh run list`;
// no database). It names every @ai-matrx package whose source on aidream main npm latest has not
// carried for 30+ minutes; `check:matrx-packages` cannot see that, because it compares this
// lockfile with npm, and npm itself is what is behind. Exit 1 = ERROR row in findings-vX.Y.Z.jsonl.
// No sibling checkout (CI): says UNMEASURED and exits 2, never a silent pass.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aidream = resolve(process.env.AIDREAM_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "..", "aidream"));
const script = join(aidream, "scripts", "check-npm-publish-lag.mjs");
if (!existsSync(script)) {
  console.log(`[npm-publish-lag] UNMEASURED — no aidream checkout at ${aidream} (set AIDREAM_DIR).`);
  process.exit(2);
}
const r = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { cwd: aidream, stdio: "inherit" });
// The failed-publish classes (FAILING / VERIFY_FAILED / LATEST_BEHIND / NO_GITHEAD / UNBOUND /
// GATE_BLOCKED / STUCK / STALE) used to be a paid GitHub workflow (publish-watch) that opened an
// "NPM PUBLISH FAILING" issue nobody read; the same script runs here, locally, for free (2026-10-15).
const health = join(aidream, "scripts", "check_ts_publish_health.mjs");
let hs = 0;
if (existsSync(health)) {
  const h = spawnSync(process.execPath, [health], { cwd: aidream, stdio: "inherit" });
  hs = h.status ?? 2;
  if (hs !== 0) console.log("[npm-publish-lag] ERROR publish health (check_ts_publish_health.mjs) reports a failed or stalled publish; read the linked run, fix the cause, re-run `node scripts/check_ts_publish_health.mjs` in aidream until it prints OK.");
}
process.exit((r.status ?? 2) !== 0 ? (r.status ?? 2) : hs);
