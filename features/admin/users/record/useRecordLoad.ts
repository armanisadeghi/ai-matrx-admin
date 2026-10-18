"use client";

import { useEffect, useState } from "react";

type Settled<T> = { token: string; data: T | null; error: unknown };

/**
 * One load for a record-page tab: `fetcher(userId)` runs when the person or `version` changes.
 * `loading` is derived (the settled result belongs to a different request), so the effect only
 * sets state from the async callback. Pass a stable module-level `fetcher`.
 */
export function useRecordLoad<T>(
  fetcher: (userId: string) => Promise<T>,
  userId: string,
  version: number,
  enabled = true,
): { data: T | null; loading: boolean; error: unknown } {
  const token = `${userId}|${version}`;
  const [settled, setSettled] = useState<Settled<T>>({ token: "", data: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetcher(userId).then(
      (data) => alive && setSettled({ token, data, error: null }),
      (error: unknown) => alive && setSettled({ token, data: null, error }),
    );
    return () => {
      alive = false;
    };
  }, [fetcher, userId, token, enabled]);

  const fresh = settled.token === token;
  return {
    data: settled.data,
    loading: enabled && !fresh,
    error: fresh ? settled.error : null,
  };
}
