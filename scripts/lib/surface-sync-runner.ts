/**
 * The retry half of the release surface sync (`scripts/check-release-surface-registration.ts`).
 *
 * WHY (2026-10-22, release v0.4.3448): the post-release sync spawned one
 * `sync-surface-manifests-direct.ts` per drifted surface from a snapshot whose `node_modules`
 * is the shared checkout's. Another session reinstalled packages during the run, so 87 of 271
 * surfaces failed with `Cannot find module '@ai-matrx/chat/surfaces/declare/surface-declare'`.
 * Nothing retried, the run ended as one finding, and the live mirror lagged the code.
 *
 * Now: every failed surface is retried in later rounds (a reinstall settles in seconds to a
 * minute, so rounds wait between them), a missing module is named as the install moving under
 * the run, and the caller ends non-zero with a summary naming every surface that never synced.
 * Pure apart from the injected `run` and `sleep`, so it is tested without a database
 * (`scripts/lib/__tests__/surface-sync-runner.test.ts`).
 */

export interface SyncRunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export type SyncRun = (args: string[]) => SyncRunResult | Promise<SyncRunResult>;

export interface SyncRetryOptions {
  /** Total tries per surface (first try included). Knob: SURFACE_SYNC_ATTEMPTS, default 3. */
  attempts: number;
  /** Wait before retry round n is n × this. Knob: SURFACE_SYNC_RETRY_DELAY_MS, default 30000. */
  delayMs: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

export interface SurfaceSyncFailure {
  name: string;
  attempts: number;
  moduleMissing: boolean;
  error: string;
}

export interface SurfaceSyncOutcome {
  synced: string[];
  /** Synced only on a retry: the first try failed. */
  recovered: string[];
  failed: SurfaceSyncFailure[];
}

const MODULE_MISSING = /Cannot find module|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find package/;

/** True when the run died because a package file was missing — the shared install moving under it. */
export function isModuleMissing(result: SyncRunResult): boolean {
  return MODULE_MISSING.test(`${result.stderr}\n${result.stdout}`);
}

/** The first line that explains a failed run (the thrown message, else the first FAIL line). */
export function firstErrorLine(result: SyncRunResult): string {
  const lines = `${result.stderr}\n${result.stdout}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) => MODULE_MISSING.test(line)) ??
    lines.find((line) => /^(Error|FAIL)\b/.test(line)) ??
    lines[0] ??
    `exit ${result.status ?? "signal"}`
  ).slice(0, 300);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function retryOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): Pick<SyncRetryOptions, "attempts" | "delayMs"> {
  const attempts = Number.parseInt(env.SURFACE_SYNC_ATTEMPTS ?? "", 10);
  const delayMs = Number.parseInt(env.SURFACE_SYNC_RETRY_DELAY_MS ?? "", 10);
  return {
    attempts: Number.isFinite(attempts) && attempts >= 1 ? attempts : 3,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 30_000,
  };
}

/** Run one command until it succeeds or the tries run out (used for the full `--check`). */
export async function runWithRetry(
  run: SyncRun,
  args: string[],
  options: SyncRetryOptions,
  accept: (result: SyncRunResult) => boolean = (result) => result.status === 0,
): Promise<{ result: SyncRunResult; attempts: number }> {
  const sleep = options.sleep ?? defaultSleep;
  let result = await run(args);
  let attempts = 1;
  while (!accept(result) && isModuleMissing(result) && attempts < options.attempts) {
    options.log?.(`RETRY ${args.join(" ")}: ${firstErrorLine(result)} (the install moved under the run; waiting)`);
    await sleep(options.delayMs * attempts);
    result = await run(args);
    attempts += 1;
  }
  return { result, attempts };
}

/** Sync each surface; failed ones are retried in later rounds, each round after a longer wait. */
export async function syncSurfacesWithRetry(
  run: SyncRun,
  names: readonly string[],
  options: SyncRetryOptions,
): Promise<SurfaceSyncOutcome> {
  const sleep = options.sleep ?? defaultSleep;
  const synced: string[] = [];
  const recovered: string[] = [];
  const last = new Map<string, SyncRunResult>();
  let pending = [...names];
  for (let round = 1; round <= options.attempts && pending.length; round += 1) {
    if (round > 1) {
      options.log?.(`RETRY round ${round}/${options.attempts}: ${pending.length} surface(s) after ${options.delayMs * (round - 1)} ms`);
      await sleep(options.delayMs * (round - 1));
    }
    const still: string[] = [];
    for (const name of pending) {
      const result = await run(["--surface", name]);
      if (result.status === 0) {
        synced.push(name);
        if (round > 1) recovered.push(name);
        options.log?.(`SURFACE SYNC ${name}: synced${round > 1 ? ` (try ${round})` : ""}`);
      } else {
        last.set(name, result);
        still.push(name);
        options.log?.(`SURFACE SYNC ${name}: FAILED try ${round}: ${firstErrorLine(result)}`);
      }
    }
    pending = still;
  }
  const failed = pending.map((name) => {
    const result = last.get(name)!;
    return { name, attempts: options.attempts, moduleMissing: isModuleMissing(result), error: firstErrorLine(result) };
  });
  return { synced, recovered, failed };
}

/** The loud end-of-run summary. The caller exits non-zero when `failed` is not empty. */
export function syncSummaryLines(outcome: SurfaceSyncOutcome, drifted: number): string[] {
  const head = `SURFACE SYNC SUMMARY: ${drifted} drifted · ${outcome.synced.length} synced (${outcome.recovered.length} on a retry) · ${outcome.failed.length} FAILED`;
  if (!outcome.failed.length) return [head];
  const moved = outcome.failed.filter((f) => f.moduleMissing).length;
  return [
    head,
    ...(moved
      ? [`  ${moved} failed on a missing module every try: the shared node_modules kept changing; rerun when installs are quiet`]
      : []),
    ...outcome.failed.map((f) => `  FAILED ${f.name} after ${f.attempts} tries: ${f.error}`),
    `  Rerun: pnpm exec tsx scripts/check-release-surface-registration.ts --apply`,
  ];
}
