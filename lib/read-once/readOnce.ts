// lib/read-once/readOnce.ts — lane TABLE-CREATE-SPEED.
//
// ONE READ PER KEY PER MOMENT. A table page's header slot is drawn in more than one place at once
// (measured in a production build: custom.synced_source read 6 times and workbench.udt_workbooks
// 3 times on every open), and each copy asked the database on mount. Every copy now shares the
// first one's request; the answer is kept for `freshMs` so copies that mount a moment later reuse
// it, then dropped so a later visit reads again. `forgetRead(key)` drops it at once (after a write).

const kept = new Map<string, { at: number; value: Promise<unknown> }>();

/** The default time an answer is shared: long enough for one page's copies to mount, short enough never to be stale. */
export const READ_ONCE_FRESH_MS = 5_000;

export function readOnce<T>(key: string, read: () => Promise<T>, freshMs: number = READ_ONCE_FRESH_MS): Promise<T> {
  const now = Date.now();
  const hit = kept.get(key);
  if (hit && now - hit.at < freshMs) return hit.value as Promise<T>;
  const value = read();
  kept.set(key, { at: now, value });
  // A failed read is never shared: the next copy asks again.
  value.catch(() => {
    if (kept.get(key)?.value === value) kept.delete(key);
  });
  return value;
}

export function forgetRead(key: string): void {
  kept.delete(key);
}
