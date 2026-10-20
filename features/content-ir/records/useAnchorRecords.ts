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

import { useEffect, useMemo } from "react";
import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
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

/**
 * Read an anchor's records, and keep them true while the reader is looking.
 *
 * The answer is kept once per anchor per tab (the Board's remount law, `useStoreRead`): a tile that
 * wakes or remounts renders the kept records and reads nothing; a failed read is never kept. The
 * record change bus and `reload()` are the deliberate re-reads, in place.
 *
 * `enabled` is THE ZERO-PREFETCH RULE made explicit: a popover that is never
 * opened costs no query. A section that is on the page passes `true`.
 */
export function useAnchorRecords(
  anchor: RecordAnchor | null,
  enabled = true,
): AnchorRecordsState {
  const anchorType = anchor?.type ?? null;
  const anchorId = anchor?.id ?? null;
  const active = enabled && Boolean(anchorType && anchorId);

  const read = useStoreRead<KindRecord[]>(
    active ? `content-ir.anchor-records:${anchorType}:${anchorId}` : null,
    async () => {
      // The reader (and the records store behind it) loads with the first read — a popover that
      // is never opened, or a page that never shows this list, never downloads it.
      const { fetchRecordsForAnchor } = await import("./kind-record-service");
      const result = await fetchRecordsForAnchor({ type: anchorType as RecordAnchor["type"], id: anchorId as string });
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    { staleAfterMs: 120_000 },
  );

  // A record saved, confirmed or archived elsewhere must not leave this list
  // showing something that is already false (THE RECORD CHANGE BUS).
  const refresh = read.refresh;
  useEffect(() => {
    if (!active) return;
    return subscribeToKindRecordChanges(() => void refresh());
  }, [active, refresh]);

  const records = read.data ?? EMPTY;
  const status: "loading" | "ready" | "error" = !active || (read.isLoading && !read.hasData)
    ? "loading"
    : read.isError && !read.hasData
      ? "error"
      : "ready";
  return useMemo(
    () => ({
      status,
      records,
      active: records.filter((r) => r.archivedAt === null),
      archived: records.filter((r) => r.archivedAt !== null),
      message: read.isError ? (read.error ?? "These records could not be read right now.") : null,
      reload: () => void refresh(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, records, read.isError, read.error],
  );
}
