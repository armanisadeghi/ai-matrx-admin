/** Read-only runtime admission against the committed candidate, never shared WIP. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { loadDbEnv } from "./lib/direct-db";
import { driftedSurfaceNames } from "./lib/surface-sync-check";
import {
  firstErrorLine,
  isModuleMissing,
  retryOptionsFromEnv,
  runWithRetry,
  syncSummaryLines,
  syncSurfacesWithRetry,
  type SyncRunResult,
} from "./lib/surface-sync-runner";

async function main() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  // --apply: the RELEASE path repairs what it finds (idempotent, soft-only sync of exactly
  // the drifted manifests, from the committed candidate). Default stays read-only.
  const apply = process.argv.includes("--apply");
  const sha =
    process.env.SURFACE_SYNC_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const env = loadDbEnv();
  if ("missing" in env)
    throw new Error(
      `Surface registration cannot be verified: missing ${env.missing.join(", ")}`,
    );
  const snapshot = mkdtempSync(resolve(tmpdir(), "matrx-surface-release-"));
  try {
    const archive = execFileSync("git", ["archive", "--format=tar", sha], {
      cwd: root,
      maxBuffer: 512 * 1024 * 1024,
    });
    const archivePath = resolve(snapshot, "source.tar");
    writeFileSync(archivePath, archive);
    execFileSync("tar", ["-xf", archivePath, "-C", snapshot]);
    rmSync(archivePath);
    symlinkSync(
      resolve(root, "node_modules"),
      resolve(snapshot, "node_modules"),
      "dir",
    );
    console.log(
      `Checking surface registrations for committed candidate ${sha}`,
    );
    const childEnv = {
      ...process.env,
      SUPABASE_MATRIX_USER: env.user,
      SUPABASE_MATRIX_PASSWORD: env.password,
      SUPABASE_MATRIX_HOST: env.host,
      SUPABASE_MATRIX_PORT: String(env.port),
      SUPABASE_MATRIX_DATABASE_NAME: env.database,
    };
    const tsx = resolve(root, "node_modules/.bin/tsx");
    const run = (args: string[]): SyncRunResult => {
      const r = spawnSync(tsx, ["scripts/sync-surface-manifests-direct.ts", ...args], {
        cwd: snapshot,
        env: childEnv,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
    };
    // The snapshot's node_modules is the shared checkout's (a symlink): another session's
    // install can swap a package mid-run. A run that dies on a missing module is retried after
    // a wait, and every surface that fails is retried in later rounds (v0.4.3448: 87 surfaces
    // failed on `Cannot find module …/surface-declare` and nothing retried).
    const retry = { ...retryOptionsFromEnv(), log: (line: string) => console.log(line) };
    // Full mirror check: values, roles, write targets, client tools AND every surface column
    // the code claims — parent_surface_name, situation, taxonomy_node_slug — so a pure
    // re-parent is drift on its own. Read-only mode reports it; --apply syncs exactly those.
    const { result: full } = await runWithRetry(run, ["--check"], retry, (r) => r.status === 0 || driftedSurfaceNames(r.stderr).length > 0);
    if (full.status !== 0 && isModuleMissing(full))
      throw new Error(`Surface mirror check could not load its modules after ${retry.attempts} tries (the shared node_modules kept changing): ${firstErrorLine(full)}`);
    const drifted = driftedSurfaceNames(full.stderr);
    if (full.status !== 0 && drifted.length === 0) {
      console.error(full.stdout, full.stderr);
      throw new Error("Surface mirror check failed with nothing syncable");
    }
    let syncFailed = 0;
    if (apply) {
      const outcome = await syncSurfacesWithRetry(run, drifted, retry);
      syncFailed = outcome.failed.length;
      const summary = syncSummaryLines(outcome, drifted.length);
      (syncFailed ? console.error : console.log)(summary.join("\n"));
    } else if (drifted.length) {
      console.error(full.stderr);
      console.error(`SURFACE MIRROR DRIFT: ${drifted.length} surface(s) differ from the committed candidate; repair: pnpm exec tsx scripts/check-release-surface-registration.ts --apply`);
    } else console.log("Surface mirror already matches the committed candidate.");
    const { result: final } = await runWithRetry(run, ["--check", "--registration-only"], retry);
    process.stdout.write(final.stdout);
    process.stderr.write(final.stderr);
    if (final.status !== 0) throw new Error("Surface registration admission failed");
    if (syncFailed) throw new Error(`Surface sync FAILED for ${syncFailed} surface(s) after retries; the live mirror lags the code (summary above)`);
    if (!apply && drifted.length) throw new Error(`Surface mirror drift: ${drifted.length} surface(s)`);
    const after = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (after !== sha)
      console.log(
        `Surface admission remains valid for committed candidate ${sha}; HEAD advanced to ${after} while its immutable archive was checked.`,
      );
  } finally {
    rmSync(snapshot, { recursive: true, force: true });
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Surface registration admission failed",
  );
  process.exitCode = 1;
});
