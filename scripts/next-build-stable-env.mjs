#!/usr/bin/env node
// `next build` with no PER-BUILD values in its environment (THE BUILD-CACHE LAW, 2026-10-11).
//
// Next compiles every NEXT_PUBLIC_* variable into the bundle. Vercel adds NEXT_PUBLIC_VERCEL_*
// variables that change on EVERY build (commit sha, commit message, author, deployment url…),
// and a value that changes per build makes Turbopack recompile what reads it — the persistent
// compile cache then saves nothing (measured: same deployment id → warm compile 78 s; new id →
// 3-4.4 min). They are removed here; code that needs the deployment or commit reads them at
// REQUEST time through lib/deployment/build-identity.ts. Every other variable passes through.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

// An agent's local build runs under the machine guard (one at a time machine-wide, stopped at its
// memory ceiling — scripts/machine-guard/build-guard.cjs); Vercel, CI and a person's terminal run it directly.
const { JOB_SH, buildNeedsGuard, supervisedByWrapper } = createRequire(import.meta.url)("./machine-guard/build-guard.cjs");

const PER_BUILD = /^NEXT_PUBLIC_VERCEL_/;
export function stableEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !PER_BUILD.test(k)));
}

// THE STALLED-COMPILE WATCHDOG (2026-10-22). Next 16.4.2's Turbopack intermittently deadlocks in
// "Creating an optimized production build": every thread parked, 0% CPU, no output, until Vercel's
// 45-minute cap kills it (v0.4.3447; the same commits then compiled in 6-10 min on six bisect
// previews, so no commit causes it). On Vercel a compile that has not finished STALL_MINUTES after
// it started is killed and run ONCE more; a second stall fails the build loudly. Healthy compiles
// measured 6.1-10.3 min (2026-10-22); 17 leaves the retry room inside the 45-minute cap.
const COMPILE_STALL_MINUTES = 17;
const COMPILE_STARTED = /Creating an optimized production build/;
// Any line Next prints only once the compile is over ends the clock (page data / static pages too).
const COMPILE_ENDED = /Compiled successfully|Failed to compile|Build error occurred|Turbopack build failed|Collecting page data|Generating static pages/;

export function runNext(cmd, args, { watchdog, stallMs = COMPILE_STALL_MINUTES * 60_000 }) {
  return new Promise((resolve) => {
    // Its own process group, so a stalled compile is killed with every Turbopack worker it started.
    const child = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"], env: stableEnv(process.env), detached: watchdog });
    let timer = null;
    let stalled = false;
    // The last few hundred characters carry over, so a line split across two pipe reads still matches.
    let tail = "";
    const watch = (chunk, out) => {
      out.write(chunk);
      if (!watchdog) return;
      const text = tail + chunk.toString();
      tail = text.slice(-300);
      if (!timer && COMPILE_STARTED.test(text)) {
        timer = setTimeout(() => {
          stalled = true;
          console.error(`[compile-watchdog] STALLED: Turbopack compile still running after ${COMPILE_STALL_MINUTES} min (healthy: 6-10 min). Killing the build's process group.`);
          try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
        }, stallMs);
      }
      if (timer && COMPILE_ENDED.test(text)) { clearTimeout(timer); timer = null; }
    };
    child.stdout.on("data", (c) => watch(c, process.stdout));
    child.stderr.on("data", (c) => watch(c, process.stderr));
    child.on("close", (code) => { if (timer) clearTimeout(timer); resolve({ code: code ?? 1, stalled }); });
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const removed = Object.keys(process.env).filter((k) => PER_BUILD.test(k));
  if (removed.length) console.log(`[stable-env] next build runs without ${removed.length} per-build variable(s): ${removed.join(", ")}`);
  const nextArgs = ["build", ...process.argv.slice(2)];
  const guarded = buildNeedsGuard({ env: process.env, platform: process.platform }) && !supervisedByWrapper(process.env);
  const [cmd, args] = guarded ? ["bash", [JOB_SH, "next-build", "--", "next", ...nextArgs]] : ["next", nextArgs];
  if (guarded) console.log("[machine-guard] local agent build: running under scripts/machine-guard/job.sh next-build");
  // Vercel only: a local agent build is already supervised by the machine guard.
  const watchdog = process.env.VERCEL === "1";
  let result = await runNext(cmd, args, { watchdog });
  if (result.stalled) {
    console.error("[compile-watchdog] RETRYING the build once (intermittent Turbopack deadlock, see scripts/next-build-stable-env.mjs).");
    result = await runNext(cmd, args, { watchdog });
    if (result.stalled) console.error("[compile-watchdog] STALLED TWICE: failing the build. Read the log above; this is no longer an intermittent hang.");
  }
  process.exit(result.code);
}
