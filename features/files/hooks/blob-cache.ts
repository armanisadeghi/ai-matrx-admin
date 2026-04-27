/**
 * features/files/hooks/blob-cache.ts
 *
 * Module-level LRU cache for file blobs that survives React mount /
 * unmount cycles. Without it, closing and reopening a 10MB PDF re-fetches
 * the whole blob over the wire — useFileBlob keeps its blob in component
 * state, so unmount = `URL.revokeObjectURL` + lost bytes.
 *
 * Design:
 *   - Single `Map<fileId, CacheEntry>`. Map iteration order = insertion
 *     order, so re-inserting on a cache hit gives us LRU for free.
 *   - Capped by total bytes (default 250 MB). When inserts push past
 *     the cap, oldest entries are evicted and their object URLs revoked.
 *   - The cache OWNS the object URL. `useFileBlob` reads `entry.url`
 *     directly and does NOT revoke on unmount — only the cache itself
 *     revokes, on eviction or explicit invalidation.
 *
 * Invalidation hooks:
 *   - `invalidate(fileId)` — single file. Used by upload-version /
 *     restore-version / delete thunks + realtime middleware on
 *     cross-device version inserts.
 *   - `invalidateAll()` — for sign-out / identity swap.
 *
 * Why not Redux: Blobs are not serialisable; storing them in the slice
 * would trigger RTK serializableCheck warnings on every dispatch and
 * the full blob would be passed through every middleware. A module-
 * level Map is the right primitive for this.
 *
 * Why not IndexedDB: re-fetching a blob from IndexedDB on every mount
 * would still be measurably slower than an in-memory Blob, and the
 * cache lives only for a session anyway — we don't need persistence
 * across page reloads.
 */

const DEFAULT_BUDGET_BYTES = 250 * 1024 * 1024; // 250 MB total

interface CacheEntry {
  blob: Blob;
  /** `blob:`-scheme URL — owned by the cache; revoked on eviction. */
  url: string;
  /** `blob.size` cached so eviction math doesn't need to re-read. */
  bytes: number;
  /** Last-access timestamp (ms). Updated on cache hits. */
  lastAccessed: number;
}

const cache = new Map<string, CacheEntry>();
let totalBytes = 0;
let budgetBytes = DEFAULT_BUDGET_BYTES;

/**
 * Read a cached entry. Touches the LRU position so re-accesses keep
 * the entry alive. Returns `null` on miss.
 */
export function getCached(fileId: string): CacheEntry | null {
  const entry = cache.get(fileId);
  if (!entry) return null;
  // Bump LRU position by re-inserting at the end of the iteration order.
  cache.delete(fileId);
  entry.lastAccessed = Date.now();
  cache.set(fileId, entry);
  return entry;
}

/**
 * Insert (or overwrite) a cached entry. The cache takes ownership of
 * `blob` + `url` — callers should NOT revoke the URL themselves.
 *
 * If a previous entry for the same fileId exists, its URL is revoked
 * and the entry is replaced. After insert, the cache evicts oldest
 * entries until the total byte size is under the budget.
 */
export function setCached(fileId: string, blob: Blob, url: string): void {
  // Replace any existing entry — must revoke the old URL.
  const existing = cache.get(fileId);
  if (existing) {
    URL.revokeObjectURL(existing.url);
    totalBytes -= existing.bytes;
    cache.delete(fileId);
  }

  const entry: CacheEntry = {
    blob,
    url,
    bytes: blob.size,
    lastAccessed: Date.now(),
  };
  cache.set(fileId, entry);
  totalBytes += entry.bytes;

  // Evict oldest entries until the cache is under budget. Map iteration
  // order is insertion order, so the oldest LRU entry is the first key.
  while (totalBytes > budgetBytes && cache.size > 1) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey || oldestKey === fileId) break;
    const oldest = cache.get(oldestKey);
    if (oldest) {
      URL.revokeObjectURL(oldest.url);
      totalBytes -= oldest.bytes;
    }
    cache.delete(oldestKey);
  }
}

/**
 * Drop a single file's cached entry. Use this from any code path that
 * makes the cached bytes stale: new-version upload, restore-version,
 * hard-delete, realtime-broadcast cross-device version insert.
 */
export function invalidate(fileId: string): void {
  const entry = cache.get(fileId);
  if (!entry) return;
  URL.revokeObjectURL(entry.url);
  totalBytes -= entry.bytes;
  cache.delete(fileId);
}

/**
 * Drop the entire cache. Use on sign-out / identity swap so the next
 * user can never see the previous user's blob URLs lingering in
 * memory.
 */
export function invalidateAll(): void {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  cache.clear();
  totalBytes = 0;
}

/**
 * Test/debug helper. Useful for diagnostic pages that want to render
 * "blob cache: 3 files, 47 MB / 250 MB".
 */
export function getCacheStats(): {
  entryCount: number;
  totalBytes: number;
  budgetBytes: number;
} {
  return {
    entryCount: cache.size,
    totalBytes,
    budgetBytes,
  };
}

/**
 * Dev/test only — change the size budget at runtime. The default is
 * 250 MB (DEFAULT_BUDGET_BYTES).
 */
export function setBudgetBytes(bytes: number): void {
  budgetBytes = Math.max(0, bytes);
}
