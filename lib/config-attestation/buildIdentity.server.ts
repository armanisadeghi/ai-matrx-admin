import "server-only";
// Server side of the web build identity for config attestation, read at REQUEST time (the
// build-cache law in lib/deployment/build-identity.ts: nothing per-build is compiled in).
//   - app version: package.json `version`, read from disk.
//   - any run that is not a Vercel deployment (development, a local `next start`): the checkout's HEAD stands in for
//     the build sha, and says so (LOCAL_BUILD_META).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let version: string | null | undefined;

export function serverAppVersion(): string {
  if (version === undefined) {
    try {
      version = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version?: string }).version ?? null;
    } catch (error) {
      console.error("[config-attestation] package.json version unreadable; config reads will not be reported", error);
      version = null;
    }
  }
  return version ?? "";
}

/**
 * Any run that is not a Vercel deployment: the checkout's HEAD stands in for the build sha (the tree may be dirty -
 * announced by the client as a local build, and its reports are filed as automation). Vercel always sets
 * VERCEL_GIT_COMMIT_SHA, and the layout asks this only when that is empty.
 *
 * SERVER-ROWS (2026-10-20): this used to answer only in development, so a local production build (`next start`, the
 * build every speed lane measures on) carried no sha at all and every signed-in page logged
 * `[config-attestation] no_build_identity` to the client error log - one red row per page session, for a build that
 * has an identity. A production run asks git once per process (its HEAD is the build it serves); development asks per
 * request (the checkout moves under a dev server).
 */
let productionSha: string | undefined;
export function localBuildSha(): string {
  if (process.env.VERCEL) return "";
  if (process.env.NODE_ENV !== "development" && productionSha !== undefined) return productionSha;
  let sha = "";
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", timeout: 2000 }).trim();
  } catch {
    sha = "";
  }
  if (process.env.NODE_ENV !== "development") productionSha = sha;
  return sha;
}
