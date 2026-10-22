// scripts/lib/surface-emitters.ts — WHO CALLS EACH SURFACE SCOPE BUILDER, IN ONE PASS.
//
// `pnpm surface:census` hung with no output on 2026-10-22 (300 s and 590 s). Cause: it ran
// one `git grep -lw <builder>` over the whole working tree PER scope builder — 244 builders
// at ~7 s each (mostly system time on a 38k-file checkout) is ~28 minutes, all before the
// first line of output. It also re-scanned the 1,857 files of the installed chat package
// once per builder.
//
// This module answers the same question with ONE `git grep` (all builders as one
// alternation) and ONE pass over the package files, so the cost no longer grows with the
// number of surfaces. Every git call carries a timeout, and only "no match" (exit 1) is
// read as empty — any other failure throws with its reason instead of becoming a silent
// "nothing emits this". Proven by `scripts/__tests__/surface-emitters.test.ts`.
//
// CommonJS-safe on purpose (no import.meta): jest imports it.

import { execFileSync } from "node:child_process";

export interface GrepOptions {
  readonly cwd?: string;
  /** Extra git pathspecs, e.g. `:!features/surfaces/manifests/*.manifest.ts`. */
  readonly pathspecs?: readonly string[];
  /** Hard ceiling for the one git call. */
  readonly timeoutMs?: number;
  /** Injected for tests that count spawns; defaults to node's execFileSync. */
  readonly exec?: typeof execFileSync;
}

export const DEFAULT_GREP_TIMEOUT_MS = 60_000;

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function checkedNames(names: readonly string[]): readonly string[] {
  for (const n of names) {
    if (!IDENT.test(n)) throw new Error(`surface-emitters: not an identifier: ${JSON.stringify(n)}`);
  }
  return names;
}

function alternation(names: readonly string[]): string {
  return checkedNames(names).map((n) => n.replace(/\$/g, "\\$")).join("|");
}

/**
 * Files (repo-relative, tests excluded) that name each builder as a whole word.
 * One git process regardless of how many builders are asked about.
 */
export function builderCallSites(
  builders: readonly string[],
  opts: GrepOptions = {},
): Map<string, string[]> {
  const out = new Map<string, string[]>(builders.map((b) => [b, []]));
  const unique = [...new Set(builders)];
  if (unique.length === 0) return out;
  const exec = opts.exec ?? execFileSync;
  const timeout = opts.timeoutMs ?? DEFAULT_GREP_TIMEOUT_MS;
  let stdout: string;
  try {
    stdout = exec(
      "git",
      // Fixed strings, one -e each: git's multi-string matcher is ~4x faster than one
      // 250-way regex alternation over this tree (13.6 s vs 56 s, 2026-10-22).
      ["grep", "-owF", ...checkedNames(unique).flatMap((n) => ["-e", n]), "--", "*.ts", "*.tsx", ...(opts.pathspecs ?? [])],
      {
        cwd: opts.cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 256 * 1024 * 1024,
        timeout,
      },
    ) as unknown as string;
  } catch (error) {
    const e = error as { status?: number | null; signal?: string | null; stderr?: unknown; message?: string };
    if (e.status === 1 && !e.signal) return out; // git grep: nothing matched
    if (e.signal === "SIGTERM" || /ETIMEDOUT/.test(String(e.message)))
      throw new Error(`surface-emitters: git grep for ${unique.length} scope builders exceeded ${timeout} ms`);
    throw new Error(
      `surface-emitters: git grep failed (status ${e.status ?? "?"}): ${String(e.stderr ?? e.message ?? "").trim()}`,
    );
  }
  const seen = new Set<string>();
  for (const line of stdout.split("\n")) {
    const cut = line.lastIndexOf(":");
    if (cut <= 0) continue;
    const file = line.slice(0, cut).trim();
    const name = line.slice(cut + 1).trim();
    if (!file || file.includes(".test.") || !out.has(name)) continue;
    const key = `${name}\u0000${file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.get(name)!.push(file);
  }
  return out;
}

/** Same question over in-memory files (the installed package): one regex pass per file. */
export function builderSitesInFiles(
  builders: readonly string[],
  files: readonly { file: string; text: string }[],
): Map<string, string[]> {
  const out = new Map<string, string[]>(builders.map((b) => [b, []]));
  const unique = [...new Set(builders)];
  if (unique.length === 0) return out;
  const re = new RegExp(`(?<![A-Za-z0-9_$])(${alternation(unique)})(?![A-Za-z0-9_$])`, "g");
  for (const { file, text } of files) {
    const hit = new Set<string>();
    for (const m of text.matchAll(re)) hit.add(m[1]!);
    for (const name of hit) out.get(name)!.push(file);
  }
  return out;
}
