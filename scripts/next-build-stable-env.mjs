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

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const removed = Object.keys(process.env).filter((k) => PER_BUILD.test(k));
  if (removed.length) console.log(`[stable-env] next build runs without ${removed.length} per-build variable(s): ${removed.join(", ")}`);
  const nextArgs = ["build", ...process.argv.slice(2)];
  const guarded = buildNeedsGuard({ env: process.env, platform: process.platform }) && !supervisedByWrapper(process.env);
  const [cmd, args] = guarded ? ["bash", [JOB_SH, "next-build", "--", "next", ...nextArgs]] : ["next", nextArgs];
  if (guarded) console.log("[machine-guard] local agent build: running under scripts/machine-guard/job.sh next-build");
  const child = spawn(cmd, args, { stdio: "inherit", env: stableEnv(process.env) });
  child.on("close", (code) => process.exit(code ?? 1));
}
