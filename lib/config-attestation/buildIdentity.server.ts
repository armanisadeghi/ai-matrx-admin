import "server-only";
// Server side of the web build identity for config attestation, read at REQUEST time (the
// build-cache law in lib/deployment/build-identity.ts: nothing per-build is compiled in).
//   - app version: package.json `version`, read from disk.
//   - development: the checkout's HEAD stands in for the build sha, and says so (LOCAL_BUILD_META).
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

/** Development only: the checkout's HEAD (the tree may be dirty — announced by the client). */
export function localBuildSha(): string {
  if (process.env.NODE_ENV !== "development") return "";
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", timeout: 2000 }).trim();
  } catch {
    return "";
  }
}
