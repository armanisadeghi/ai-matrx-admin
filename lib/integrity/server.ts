// lib/integrity/server.ts
//
// Server-side adapters that wire the integrity framework to live infrastructure:
//   - a SqlRunner backed by the `execute_admin_query` SECURITY DEFINER RPC
//     (same path the admin SQL editor uses), via the RLS-bypassing admin client.
//   - a FileProbe backed by the files package's `GET /files/{id}/download` operation.
//
// Kept out of the route file so a CLI/cron caller could reuse the SQL runner too.

import { spawn } from "node:child_process";
import { requireSuperAdminDatabaseClient } from "@/features/administration/database-hub/require-super-admin-database-client";
import type {
  FileProbe,
  IntegrityFinding,
  ScriptRunner,
  SqlRunner,
} from "./types";
import { unwrapRows } from "./unwrap";
import { MatrxApiError } from "@ai-matrx/api";
import { downloadFile } from "@ai-matrx/api/files";
import { createFiles } from "@ai-matrx/files";

/** SQL runner using the admin client + execute_admin_query RPC. */
export async function createAdminSqlRunner(): Promise<SqlRunner> {
  const admin = await requireSuperAdminDatabaseClient();
  return async (query: string): Promise<IntegrityFinding[]> => {
    const { data, error } = await admin.schema("platform").rpc("execute_admin_query", { query });
    if (error) throw new Error(error.message);
    return unwrapRows(data);
  };
}

const SCRIPT_DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const SCRIPT_OUTPUT_CAP = 64 * 1024; // keep only the trailing 64 KB

/**
 * ScriptRunner that shells out to `pnpm run <script>` at the repo root.
 * Returns undefined on serverless hosts (Vercel) where the repo's dev
 * toolchain isn't available — script checks then report `skipped`.
 * Only ever invoked from the super-admin integrity route, with script names
 * taken from the static check registry (never caller input).
 */
export function createScriptRunner(): ScriptRunner | undefined {
  if (process.env.VERCEL) return undefined;

  return (def) =>
    new Promise((resolvePromise) => {
      const timeoutMs = def.timeoutMs ?? SCRIPT_DEFAULT_TIMEOUT_MS;
      let output = "";
      let settled = false;
      const append = (chunk: Buffer) => {
        output += chunk.toString("utf8");
        if (output.length > SCRIPT_OUTPUT_CAP) {
          output = output.slice(-SCRIPT_OUTPUT_CAP);
        }
      };
      const finish = (exitCode: number | null, error?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolvePromise({ exitCode, output, ...(error ? { error } : {}) });
      };

      const child = spawn("pnpm", ["run", def.script], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(null, `gate timed out after ${timeoutMs}ms and was killed`);
      }, timeoutMs);

      child.stdout.on("data", append);
      child.stderr.on("data", append);
      child.on("error", (err) => finish(null, err.message));
      child.on("close", (code) => finish(code));
    });
}

/**
 * Builds a FileProbe that range-probes the download endpoint with the given
 * bearer token. Returns undefined when no token is available (the caller then
 * reports the probe check as skipped).
 *
 * Organization admission: the backend's AuthMiddleware refuses a Bearer-JWT
 * request without `X-Organization-Id` (400 organization_required), so a probe
 * without an organization can only ever measure the gate, not the download.
 * The caller passes the requester's own organization; without one the probe is
 * skipped (undefined) so the report says "skipped: select an organization"
 * instead of a wall of 400s.
 */
export function createDownloadProbe(
  token: string | null,
  organizationId: string | null = null,
): FileProbe | undefined {
  if (!token || !organizationId) return undefined;
  // The files package's own client: the contract decides which deployment answers the download.
  const files = createFiles({ credentials: { kind: "user", accessToken: token }, organizationId });

  return async (fileId: string) => {
    const start = Date.now();
    try {
      const res = await downloadFile(
        files.api,
        { path: { file_id: fileId }, query: { inline: true } },
        // Cheap liveness probe — just the first byte.
        { headers: { Range: "bytes=0-0" } },
      );
      // Drain the (tiny) body so the socket can be reused/closed.
      await res.arrayBuffer().catch(() => undefined);
      return { status: res.status, ms: Date.now() - start };
    } catch (err) {
      if (err instanceof MatrxApiError) return { status: err.status, ms: Date.now() - start };
      return {
        status: null,
        ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}
