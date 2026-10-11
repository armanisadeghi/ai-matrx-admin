#!/usr/bin/env node
// Should this SATELLITE site (admin, demos, lab) build on a `release-all:` release?
//
// Rule (Arman, 2026-10-11; constants in scripts/build-cache-policy.cjs):
//   build when one of the site's OWN route-group folders changed since its last build
//   (SATELLITE_OWN_PATHS, compared by git tree id), or that last build is older than
//   SATELLITE_MAX_AGE_MIN, so shared code reaches it within the hour. Otherwise skip.
//   `[all-sites]` in the release message builds every site; `release-admin:` /
//   `release-demos:` / `release-lab:` always build that site (scripts/vercel-ignore-build.sh).
// The last build is remembered in S3 (satellite-builds/<target>.json), written by `record` at
// the end of a successful build. Anything unknown or failing → BUILD (never a silent skip).
//
// Usage:
//   node scripts/satellite-builds.mjs decide <target>   exit 0 = skip, exit 1 = build (ignoreCommand convention)
//   node scripts/satellite-builds.mjs record            after a successful satellite build
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { bucketObject, s3 } from "./build-cache.mjs";

const { SATELLITE_MAX_AGE_MIN, SATELLITE_OWN_PATHS } = createRequire(import.meta.url)("./build-cache-policy.cjs");
const log = (m) => console.log(`[satellite] ${m}`);

/** git tree ids of the site's own folders at HEAD (works in Vercel's shallow clone). */
export function ownTrees(target, git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim()) {
  return (SATELLITE_OWN_PATHS[target] ?? []).map((p) => {
    try {
      return `${p}=${git(["rev-parse", `HEAD:${p}`])}`;
    } catch {
      return `${p}=absent`;
    }
  });
}

/** Pure decision: { build, reason }. */
export function decide({ target, message = "", trees, state, now = Date.now(), maxAgeMin = SATELLITE_MAX_AGE_MIN }) {
  if (!SATELLITE_OWN_PATHS[target]) return { build: true, reason: `target ${target} is not a satellite` };
  if (message.includes("[all-sites]")) return { build: true, reason: "[all-sites] in the release message" };
  if (!state) return { build: true, reason: "no record of a previous build" };
  if (JSON.stringify(state.trees) !== JSON.stringify(trees)) return { build: true, reason: `its own pages changed (${SATELLITE_OWN_PATHS[target].join(", ")})` };
  const age = (now - state.builtAt) / 60000;
  if (!(age < maxAgeMin)) return { build: true, reason: `last build is ${age.toFixed(0)} min old (≥ ${maxAgeMin})` };
  return { build: false, reason: `own pages unchanged since ${state.sha ? state.sha.slice(0, 9) : "its last build"} and that build is ${age.toFixed(0)} min old (< ${maxAgeMin}); shared-code changes arrive within the hour` };
}

async function readState(target) {
  const s = bucketObject(`satellite-builds/${target}.json`);
  if (!s) throw new Error("no bucket credentials");
  const res = await s3(s, "GET");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${res.status}`);
  return res.json();
}

async function main(cmd, arg) {
  if (cmd === "decide") {
    const target = arg;
    try {
      const d = decide({ target, message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "", trees: ownTrees(target), state: await readState(target) });
      log(`${d.build ? "BUILD" : "SKIP"} ${target}: ${d.reason}`);
      process.exit(d.build ? 1 : 0);
    } catch (e) {
      log(`BUILD ${target}: could not decide (${e.message})`);
      process.exit(1);
    }
  }
  if (cmd === "record") {
    const target = process.env.MATRX_BUILD_TARGET;
    if (!SATELLITE_OWN_PATHS[target]) return;
    const s = bucketObject(`satellite-builds/${target}.json`);
    if (!s) return log(`not recorded (${target}): no bucket credentials`);
    const body = JSON.stringify({ trees: ownTrees(target), builtAt: Date.now(), sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "" });
    try {
      const res = await s3(s, "PUT", { headers: { "content-length": Buffer.byteLength(body), "content-type": "application/json" }, body });
      log(res.ok ? `recorded ${target} build` : `record FAILED ${res.status} (next release-all simply builds ${target})`);
    } catch (e) {
      log(`record FAILED (${e.message}); next release-all simply builds ${target}`);
    }
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) void main(process.argv[2], process.argv[3]).catch((e) => { console.error(e); process.exit(1); });
