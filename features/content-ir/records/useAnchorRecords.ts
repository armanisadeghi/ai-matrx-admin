"use client";

/**
 * useAnchorRecords — the read behind THE ONE reverse view of a record's anchor
 * (AnchorRecordsList.tsx renders what this returns).
 *
 * Its own module so the hook can be registered and imported without the list's
 * rows, and so the records reader (kind-record-service → the records store) loads
 * with the first read instead of with every page that merely mounts a host
 * (2026-10-13: chatAppDataRegistration put the whole records cluster in every
 * route's first load through this hook).
 */

import { useCallback, useEffect, useState } from "react";
import type { KindRecord, RecordAnchor } from "./kind-record-service";
import { subscribeToKindRecordChanges } from "./record-change-bus";

export interface AnchorRecordsState {
  status: "loading" | "ready" | "error";
  /** Every record, archived included — the two lists below are derived. */
  records: KindRecord[];
  active: KindRecord[];
  archived: KindRecord[];
  message: string | null;
  reload: () => void;
}

const EMPTY: KindRecord[] = [];

/** One completed read, stamped with the request it answers. */
interface Answer {
  key: string;
  ok: boolean;
  records: KindRecord[];
  message: string | null;
}

/**
 * Read an anchor's records, and keep them true while the reader is looking.
 *
 * `enabled` is THE ZERO-PREFETCH RULE made explicit: a popover that is never
 * opened costs no query. A section that is on the page passes `true`.
 */
export function useAnchorRecords(
  anchor: RecordAnchor | null,
  enabled = true,
): AnchorRecordsState {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  const anchorType = anchor?.type ?? null;
  const anchorId = anchor?.id ?? null;
  // The request said ONCE. An answer is rendered only while it still answers
  // the question being asked, so switching anchor (or asking again) reads as
  // "loading" WITHOUT a reset write in the effect body — the cascading-render
  // pattern React now refuses.
  const requestKey =
    enabled && anchorType && anchorId
      ? `${anchorType}:${anchorId}:${reloadKey}`
      : null;

  useEffect(() => {
    if (!requestKey || !anchorType || !anchorId) return;
    let cancelled = false;
    void (async () => {
      // The reader (and the records store behind it) loads with the first read — a popover that
      // is never opened, or a page that never shows this list, never downloads it.
      let result: Awaited<ReturnType<typeof import("./kind-record-service").fetchRecordsForAnchor>>;
      try {
        const { fetchRecordsForAnchor } = await import("./kind-record-service");
        result = await fetchRecordsForAnchor({ type: anchorType, id: anchorId });
      } catch (error) {
        if (cancelled) return;
        setAnswer({
          key: requestKey,
          ok: false,
          records: EMPTY,
          message: error instanceof Error ? error.message : "These records could not be read right now.",
        });
        return;
      }
      if (cancelled) return;
      setAnswer(
        result.ok
          ? { key: requestKey, ok: true, records: result.value, message: null }
          : {
              key: requestKey,
              ok: false,
              records: EMPTY,
              message: result.message,
            },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, anchorType, anchorId]);

  // A record saved, confirmed or archived elsewhere must not leave this list
  // showing something that is already false (THE RECORD CHANGE BUS).
  useEffect(() => {
    if (!enabled) return;
    return subscribeToKindRecordChanges(() => setReloadKey((n) => n + 1));
  }, [enabled]);

  const current = answer && answer.key === requestKey ? answer : null;
  const status: "loading" | "ready" | "error" = !current
    ? "loading"
    : current.ok
      ? "ready"
      : "error";
  const records = current?.records ?? EMPTY;
  const message = current?.message ?? null;

  return {
    status,
    records,
    active: records.filter((r) => r.archivedAt === null),
    archived: records.filter((r) => r.archivedAt !== null),
    message,
    reload,
  };
}
