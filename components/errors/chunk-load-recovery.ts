// Chunk-error auto-recovery for stale tabs after a Vercel deploy.
//
// When Vercel ships a new build, content-hashed chunk filenames change and
// the old ones are eventually purged from the CDN. Browser tabs left open
// across the deploy then 404 on those chunks and surface a `ChunkLoadError`.
// Vercel Skew Protection (configured via `deploymentId` in next.config.js)
// solves this for tabs that opened during the protection window, but for
// tabs older than the window — or for any chunk request that escapes the
// protection — we still want to recover gracefully by reloading.
//
// The reload is gated by sessionStorage so we don't trap the user in a
// reload loop if the new build itself is genuinely broken.

const RELOAD_FLAG_KEY = "chunk-load-recovery:last-reload";
const RELOAD_LOOP_GUARD_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; message?: unknown };
  if (e.name === "ChunkLoadError") return true;
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to load chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * Reloads the page exactly once per ~30s window. Returns true if a reload
 * was triggered (caller can early-return), false if we suppressed it because
 * a reload already happened recently — in which case the caller should fall
 * through to the normal error UI.
 */
export function attemptChunkReload(error: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(error)) return false;

  try {
    const lastRaw = window.sessionStorage.getItem(RELOAD_FLAG_KEY);
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    if (last && now - last < RELOAD_LOOP_GUARD_MS) {
      // Already reloaded recently — the new build is also failing. Show the
      // real error UI so the user (and admin debug panel) can see what's up.
      return false;
    }
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(now));
  } catch {
    // sessionStorage can throw in private mode / disabled storage — fall
    // through and reload anyway. Worst case: a single extra reload.
  }

  // Hard reload (no cache) so we definitely pull the latest HTML + chunks.
  window.location.reload();
  return true;
}
