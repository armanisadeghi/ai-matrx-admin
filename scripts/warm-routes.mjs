#!/usr/bin/env node
/**
 * warm-routes.mjs — after a release is READY and serving, GET each core route once so the first
 * real visitor never pays the cold start.
 *
 * Why (measured 2026-10-17): the first request to a route after a deployment takes 2.8–6.1 s of
 * server time (route code loads on first hit; Next does not preload routes on Vercel), warm hits
 * 0.3–0.8 s. Releases ship about every 30 minutes, so without this every route is cold for whoever
 * opens it first. A signed-out GET renders the same route function, so it warms the same code.
 *
 * Routes: every static top-level page under app/(core) plus a few named ones. One GET each,
 * bounded parallelism, a timeout, no retries, never fails the release (prints one summary line).
 *
 *   node scripts/warm-routes.mjs [--base https://www.aimatrx.com] [--concurrency 8] [--timeout-ms 40000]
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = opt("base", "https://www.aimatrx.com").replace(/\/$/, "");
const CONCURRENCY = Number(opt("concurrency", "8"));
const TIMEOUT_MS = Number(opt("timeout-ms", "40000"));

/**
 * Dynamic routes: a dynamic segment's route function is shared by every id, so ONE GET warms it.
 * Review A1 (2026-10-18): the first agent switch after a release paid a 3-6 s cold start on
 * `/chat/a/[agentId]`. The agent is General Chat (system, active — the chat package's
 * DEFAULT_AGENT_ID); the conversation id is a well-formed id that matches no conversation (the
 * route still loads and renders its "not found" path, which warms the same function).
 */
export const DYNAMIC = [
  "/chat/a/6b6b4e45-4699-4860-8dea-d8a60e07d69a",
  "/chat/00000000-0000-4000-8000-000000000000",
];

const EXTRA = ["/", "/chat/new", "/login", ...DYNAMIC];

export function coreRoutes(root = process.cwd()) {
  const dir = join(root, "app", "(core)");
  const routes = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[a-z0-9][a-z0-9-]*$/.test(d.name))
    .filter((d) => existsSync(join(dir, d.name, "page.tsx")))
    .map((d) => `/${d.name}`);
  return [...new Set([...EXTRA, ...routes])].sort();
}

async function warm(route) {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + route, { redirect: "manual", signal: ctl.signal, headers: { "x-matrx-warm": "1" } });
    await res.arrayBuffer().catch(() => undefined);
    return { route, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { route, status: 0, ms: Date.now() - started, error: e?.name === "AbortError" ? "timeout" : String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const routes = coreRoutes();
  const queue = [...routes];
  const results = [];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) results.push(await warm(queue.shift()));
    }),
  );
  results.sort((a, b) => b.ms - a.ms);
  const failed = results.filter((r) => r.status === 0 || r.status >= 500);
  const slowest = results.slice(0, 5).map((r) => `${r.route} ${r.ms}ms`).join(", ");
  console.log(`[warm-routes] ${results.length} routes warmed on ${BASE} · ${failed.length} failed · slowest: ${slowest}`);
  for (const r of failed) console.log(`[warm-routes] FAILED ${r.route} status=${r.status}${r.error ? ` (${r.error})` : ""}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.log(`[warm-routes] did not run: ${e?.message ?? e}`);
  });
}
