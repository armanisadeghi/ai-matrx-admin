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

const PER_BUILD = /^NEXT_PUBLIC_VERCEL_/;
export function stableEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !PER_BUILD.test(k)));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const removed = Object.keys(process.env).filter((k) => PER_BUILD.test(k));
  if (removed.length) console.log(`[stable-env] next build runs without ${removed.length} per-build variable(s): ${removed.join(", ")}`);
  const child = spawn("next", ["build", ...process.argv.slice(2)], { stdio: "inherit", env: stableEnv(process.env) });
  child.on("close", (code) => process.exit(code ?? 1));
}
