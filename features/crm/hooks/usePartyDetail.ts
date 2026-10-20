"use client";

// features/crm/hooks/usePartyDetail.ts
//
// Loads the full record bundle for one party (identity + contact points +
// addresses + employment both directions + interactions) and exposes a
// refresh the record page's mutation flows call after any write.
//
// Kept once per party per tab (the Board's remount law, `useStoreRead`): a tile that wakes from sleep or
// remounts renders the kept bundle and reads nothing, and a refresh re-reads IN PLACE (the old bundle
// stays on screen, so an open editor is never remounted and never loses focus). A failed read is not kept.

import { useCallback, useRef } from "react";
import { isRecordUnavailableError } from "@/lib/records/recordUnavailable";
import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { fetchPartyDetail } from "../service";
import type { PartyDetail } from "../types";

/** A kept answer older than this is read again in the background, the old one staying on screen. */
export const CRM_PARTY_STALE_MS = 120_000;

export interface UsePartyDetailResult {
  detail: PartyDetail | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePartyDetail(partyId: string): UsePartyDetailResult {
  const read = useStoreRead<PartyDetail>(
    partyId ? `crm.party-detail:${partyId}` : null,
    async () => {
      try {
        return await fetchPartyDetail(partyId);
      } catch (e) {
        // A RecordUnavailableError is an expected access state — already
        // captured by recordUnavailable() and rendered by the page's AccessGate.
        if (!isRecordUnavailableError(e)) {
          console.error("[crm] party detail fetch failed:", e instanceof Error ? e.message : String(e));
        }
        throw e;
      }
    },
    { staleAfterMs: CRM_PARTY_STALE_MS },
  );
  // A stable identity: cards take it as `onChanged` and key effects on it.
  const refreshRef = useRef(read.refresh);
  refreshRef.current = read.refresh;
  const refresh = useCallback(() => refreshRef.current(), []);
  return {
    detail: read.data ?? null,
    // Loading only while there is nothing to show: a refresh keeps the bundle on screen.
    isLoading: read.isLoading && !read.hasData,
    error: read.error,
    refresh,
  };
}
