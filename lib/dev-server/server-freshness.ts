/**
 * Is the LOCAL dev server still running the packages on disk? — the pure half.
 *
 * THE DEFECT THIS EXISTS FOR (Arman, 2026-10-14). A package install relinked
 * @ai-matrx/api under the running preview; the server kept the module graph it
 * booted with and a route crashed with "module factory is not available". In the
 * browser that read as `[user-acquisition] First-touch persistence failed 500 ""`
 * — a random bug in an unrelated feature that a person then had to chase. Nothing
 * was wrong with the feature; the server was stale.
 *
 * Two halves fix the class:
 *   - the preview watchdog (scripts/agent-dev-server.sh `restart_if_node_modules_moved`)
 *     restarts the server once an install settles, so staleness lasts seconds;
 *   - while it lasts, `app/api/dev/server-freshness` answers this shape and the
 *     super-admin attention dock says so in plain words (users see nothing).
 *
 * The boot list comes from the preview launcher (`MATRX_PREVIEW_BOOT_PACKAGES`,
 * "@ai-matrx/<name>@<version>" space separated), read at the moment it started Next.
 */

export interface PackageMove {
  name: string;
  /** Version the running server booted with; null when it was not installed then. */
  booted: string | null;
  /** Version on disk now; null when it was removed. */
  onDisk: string | null;
}

export interface DevServerFreshness {
  stale: boolean;
  bootedAt: string;
  /** When node_modules last changed (pnpm rewrites `.modules.yaml` on every install). */
  installedAt: string | null;
  /** Our own packages whose version moved since boot. */
  moved: PackageMove[];
  /** False when the server was not started by the preview launcher (no boot list to compare). */
  bootListKnown: boolean;
}

/** An install that finished just before boot is not "under" the server; allow this much clock slack. */
export const INSTALL_AFTER_BOOT_SLACK_MS = 2_000;

export function parseBootPackages(raw: string | undefined | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of (raw ?? "").split(/\s+/)) {
    const at = entry.lastIndexOf("@");
    if (at <= 0) continue;
    out.set(entry.slice(0, at), entry.slice(at + 1));
  }
  return out;
}

export function diffPackages(booted: ReadonlyMap<string, string>, onDisk: ReadonlyMap<string, string>): PackageMove[] {
  const names = [...new Set([...booted.keys(), ...onDisk.keys()])].sort();
  const moves: PackageMove[] = [];
  for (const name of names) {
    const was = booted.get(name) ?? null;
    const now = onDisk.get(name) ?? null;
    if (was !== now) moves.push({ name, booted: was, onDisk: now });
  }
  return moves;
}

export function assessFreshness(input: {
  bootedAtMs: number;
  installedAtMs: number | null;
  bootPackages: string | undefined | null;
  diskPackages: ReadonlyMap<string, string>;
}): DevServerFreshness {
  const bootListKnown = Boolean(input.bootPackages && input.bootPackages.trim());
  const moved = bootListKnown ? diffPackages(parseBootPackages(input.bootPackages), input.diskPackages) : [];
  const installedUnder =
    input.installedAtMs !== null && input.installedAtMs > input.bootedAtMs + INSTALL_AFTER_BOOT_SLACK_MS;
  return {
    stale: moved.length > 0 || installedUnder,
    bootedAt: new Date(input.bootedAtMs).toISOString(),
    installedAt: input.installedAtMs === null ? null : new Date(input.installedAtMs).toISOString(),
    moved,
    bootListKnown,
  };
}
