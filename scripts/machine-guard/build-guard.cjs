// scripts/machine-guard/build-guard.cjs — an agent's local `next build` runs ONLY under the machine
// guard's wrapper (docs/perf/machine-guard.md).
//
// WHY (2026-10-17): the Mac ran out of memory about five times a day; at the 10-17 04:02 event a
// node process in a Claude session's group held 78.8 GB, and runaway local jobs of 28-112 GB led every
// jetsam report. The wrapper (scripts/machine-guard/job.sh next-build) runs one local production build
// at a time machine-wide and stops the build's whole tree at its real-memory ceiling
// (kinds.next-build in ~/.config/matrx/machine-guard.json, 64 GB). `pnpm build` / `pnpm build:next`
// route through it by themselves (scripts/next-build-stable-env.mjs); a raw `next build` / `npx next
// build` from an agent is refused by next.config.js before a single worker starts.
//
// Never refused: Vercel and CI builds, builds off macOS, and a person's own terminal (no agent
// marker in the environment).

"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const JOB_SH = path.join(__dirname, "job.sh");

/** Started by an agent session (Claude Code / Codex) or one of our job wrappers. */
function agentMarked(env) {
  return (
    env.CLAUDECODE === "1" ||
    Boolean(env.CLAUDE_CODE_SESSION_ID || env.CODEX_THREAD_ID || env.CODEX_SANDBOX || env.CODEX_MANAGED_BY_NPM || env.MATRX_AGENT_JOB)
  );
}

/** A build here must go through the wrapper: a local Mac build started by an agent. */
function buildNeedsGuard({ env, platform }) {
  if (env.VERCEL || env.CI) return false;
  if (platform !== "darwin") return false;
  return agentMarked(env);
}

/** The wrapper that claims to supervise this build is real: alive, an ancestor of `pid`, and running machine_guard.py job. */
function supervisedByWrapper(env, pid = process.pid) {
  const sup = Number(env.MATRX_AGENT_JOB_SUPERVISOR);
  if (env.MATRX_AGENT_JOB_KIND !== "next-build" || !Number.isInteger(sup) || sup <= 1) return false;
  let p = pid;
  for (let hops = 0; hops < 32 && p > 1; hops += 1) {
    let row;
    try {
      row = execFileSync("ps", ["-o", "ppid=,args=", "-p", String(p)], { encoding: "utf8" }).trim();
    } catch {
      return false;
    }
    const m = /^(\d+)\s+(.*)$/s.exec(row);
    if (!m) return false;
    if (p === sup) return /machine_guard\.py\s+job\b/.test(m[2]);
    p = Number(m[1]);
  }
  return false;
}

const HOW =
  "  Run it through the machine guard instead (one local production build at a time, stopped at its memory ceiling):\n" +
  "    pnpm build:next                                          (routes through the wrapper by itself)\n" +
  "    bash scripts/machine-guard/job.sh next-build -- next build   (any other next build command)\n" +
  "  Why: runaway local jobs of 28-112 GB ran the Mac out of memory about five times a day (docs/perf/machine-guard.md).";

/** Null when this build may run; otherwise the sentence to throw. `supervised` is injectable for tests. */
function rawBuildRefusal({ env, platform, supervised }) {
  if (!buildNeedsGuard({ env, platform })) return null;
  if (supervised ?? supervisedByWrapper(env)) return null;
  return "[machine-guard] Refusing a raw local `next build` started by an agent.\n" + HOW;
}

module.exports = { JOB_SH, agentMarked, buildNeedsGuard, rawBuildRefusal, supervisedByWrapper };
