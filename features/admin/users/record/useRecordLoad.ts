"use client";

import { useEffect, useState } from "react";

type Settled<T> = { token: string; data: T | null; error: unknown };

/**
 * One load for a record-page tab: `fetcher(userId)` runs when the person or `version` changes.
 * Every tab passes the PAGE's version (plus its own), so a header action refreshes the open tab.
 * `loading` is derived (the settled result belongs to a different request), so the effect only
 * sets state from the async callback. Pass a stable module-level `fetcher`. A tab that pages
 * (Load older) folds its window into `version` (e.g. `"3:400"`), so the new window shows loading.
 */
export function useRecordLoad<T>(
  fetcher: (userId: string) => Promise<T>,
  userId: string,
  version: number | string,
  enabled = true,
): { data: T | null; loading: boolean; error: unknown } {
  const token = `${userId}|${version}`;
  const [settled, setSettled] = useState<Settled<T>>({ token: "", data: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetcher(userId).then(
      (data) => alive && setSettled({ token, data, error: null }),
      // A failed refresh of the SAME person keeps the rows it had (S15): the caller shows the error
      // inline above them instead of blanking the record.
      (error: unknown) =>
        alive &&
        setSettled((prev) => ({ token, data: prev.token.split("|")[0] === userId ? prev.data : null, error })),
    );
    return () => {
      alive = false;
    };
  }, [fetcher, userId, token, enabled]);

  const fresh = settled.token === token;
  // Same person, new version (reload) keeps the rows; a different person never shows the old one's.
  const samePerson = settled.token.split("|")[0] === userId;
  return {
    data: fresh || samePerson ? settled.data : null,
    loading: enabled && !fresh,
    error: fresh ? settled.error : null,
  };
}
