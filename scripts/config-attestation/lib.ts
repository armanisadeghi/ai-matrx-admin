/**
 * Config attestation for the web app (app_config row `ai-matrx`) — the DECLARED half.
 *
 * System of record: common-docs/systems/platform/app-config/attestation/FEATURE.md. Lane
 * CONFIG-ATTEST-ROLLOUT (2026-10-15).
 *
 * Every input comes from ONE git commit, never the shared (often dirty) checkout and never the live
 * database, so the same sha always yields the same manifest (the attest RPC refuses a second,
 * different manifest for an attested sha with 23505 manifest_conflict):
 *   - the source files are read from the commit's tree (`git ls-tree` + `git cat-file --batch`);
 *   - the knob registry is the checked-in snapshot `knob-registry-snapshot.json` AT that commit
 *     (`pnpm config:registry-snapshot` regenerates it from the live register);
 *   - `generated_at` is the commit's committer time.
 * Reads are found by `scanKnobReads` — the SAME vocabulary the settings guards use — in strict mode:
 * a constant name with two different values is unresolved, never a guess.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FRONTEND_SCAN_DIRS,
  ROOT,
  SKIP_DIR_RE,
  SKIP_FILE_RE,
  scanKnobReads,
  type DynamicRead,
  type KnobReadsAnnotation,
  type KnobRow,
  type ReadSite,
  type SourceFile,
} from "../settings-guards/lib";
import { followIndirection, poolMembers } from "./indirection";
import { loadBundled, packageContribution } from "./package-declarations";
import { appConfigReads } from "./app-config-reads";

export { appConfigReads };

export const APP = "ai-matrx";
export const SNAPSHOT_REL = "scripts/config-attestation/knob-registry-snapshot.json";
export const CEILING_REL = "scripts/config-attestation/unresolved-ceiling.json";

export interface RegistrySnapshot {
  /** sha256 of the canonical JSON of `rows`, so a hand edit is visible. */
  sha256: string;
  rows: Array<[string, string]>;
}

export function git(args: string[], input?: string): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 30, input });
}

export function snapshotHash(rows: Array<[string, string]>): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

/** The source files of `<rev>` (a sha, or "WORKTREE" for the checkout on disk) in the scanner's shape. */
export function filesAt(rev: string): SourceFile[] {
  // The chat package source (`../aidream/...`) is not in this repo's tree; the app installs it from
  // npm, so it is not part of what this commit declares.
  const dirs = FRONTEND_SCAN_DIRS.filter((d) => !d.startsWith(".."));
  const ok = (rel: string) =>
    /\.(tsx?|mjs)$/.test(rel) && !SKIP_DIR_RE.test(`matrx-frontend/${rel}`) && !SKIP_FILE_RE.test(rel.split("/").pop() ?? "");
  if (rev === "WORKTREE") {
    const listed = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...dirs]).split("\0").filter(Boolean);
    return listed
      .filter(ok)
      .filter((rel) => existsSync(join(ROOT, rel)))
      .map((rel) => ({ abs: join(ROOT, rel), rel: `matrx-frontend/${rel}`, text: readFileSync(join(ROOT, rel), "utf8") }));
  }
  const paths = git(["ls-tree", "-r", "-z", "--name-only", rev, "--", ...dirs]).split("\0").filter(Boolean).filter(ok);
  const out = execFileSync("git", ["cat-file", "--batch"], {
    cwd: ROOT,
    input: paths.map((p) => `${rev}:${p}`).join("\n") + "\n",
    maxBuffer: 1 << 30,
  });
  const files: SourceFile[] = [];
  let at = 0;
  for (const rel of paths) {
    const nl = out.indexOf(10, at);
    const header = out.subarray(at, nl).toString("utf8");
    const size = Number(header.split(" ")[2]);
    if (!Number.isFinite(size)) throw new Error(`git cat-file: unreadable header for ${rel}: ${header}`);
    const text = out.subarray(nl + 1, nl + 1 + size).toString("utf8");
    files.push({ abs: join(ROOT, rel), rel: `matrx-frontend/${rel}`, text });
    at = nl + 1 + size + 1;
  }
  return files;
}

/** The registry snapshot as committed at `<rev>` (or on disk for WORKTREE). Never the live DB. */
export function registryAt(rev: string): KnobRow[] {
  const raw = rev === "WORKTREE" ? readFileSync(join(ROOT, SNAPSHOT_REL), "utf8") : git(["show", `${rev}:${SNAPSHOT_REL}`]);
  const snap = JSON.parse(raw) as RegistrySnapshot;
  if (snapshotHash(snap.rows) !== snap.sha256) {
    throw new Error(`${SNAPSHOT_REL} at ${rev}: rows do not match its sha256 — regenerate with pnpm config:registry-snapshot`);
  }
  return snap.rows.map(([feature, key]) => ({ feature, key }) as KnobRow);
}

export interface Declared {
  sites: ReadSite[];
  dynamic: DynamicRead[];
  annotations: KnobReadsAnnotation[];
  appKeys: Map<string, Set<string>>;
  /** One line on the bundled @ai-matrx packages' knob declarations. */
  packages: string;
}

/** The lockfile at `<rev>` — which @ai-matrx package versions that commit bundles. */
export function lockfileAt(rev: string): string {
  return rev === "WORKTREE" ? readFileSync(join(ROOT, "pnpm-lock.yaml"), "utf8") : git(["show", `${rev}:pnpm-lock.yaml`]);
}

export function declaredAt(rev: string): Declared {
  const files = filesAt(rev);
  const registry = registryAt(rev);
  const scan = scanKnobReads(files, registry, { strictConsts: true });
  // The bundled packages' own declarations (reads, unresolved reads, exported addresses), then the
  // second-chance resolver over what the first pass could not name (./indirection.ts).
  const pkgs = packageContribution(loadBundled(ROOT, lockfileAt(rev)));
  const followed = followIndirection(files, scan, poolMembers(files, pkgs.addresses));
  const app = appConfigReads(files);
  return {
    sites: [...followed.sites, ...pkgs.sites],
    dynamic: [...followed.dynamic, ...pkgs.dynamic, ...app.dynamic],
    annotations: scan.annotations,
    appKeys: app.keys,
    packages: pkgs.summary,
  };
}

/** Line-insensitive identity of an unresolved site (file + fn + raw), for the ratchet. */
export const dynamicId = (d: DynamicRead) => `${d.file}|${d.fn}|${d.raw}`;

export function readCeiling(): { ceiling: number; why: string } {
  return JSON.parse(readFileSync(join(ROOT, CEILING_REL), "utf8")) as { ceiling: number; why: string };
}
