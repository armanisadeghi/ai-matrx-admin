"use client";

// features/crm/hooks/useCrmCardRead.ts
//
// One card's read on the CRM record, kept once per record per tab (the Board's remount law,
// `useStoreRead`). A tile that wakes from sleep or remounts renders the kept answer and reads nothing;
// `refresh()` re-reads IN PLACE (the old answer stays on screen, so an open editor beside it never
// remounts or loses focus); a failed read is never kept, so the next mount asks again.
//
// `cause` is the thrown error itself for the latest failed read (cards tell "no organization selected"
// from a real failure by the error's code, which a stored message string no longer carries).

import { useState } from "react";
import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { CRM_PARTY_STALE_MS } from "./usePartyDetail";

export function useCrmCardRead<T>(
  key: string | null,
  read: () => Promise<T>,
  options: { enabled?: boolean } = {},
) {
  const [cause, setCause] = useState<unknown>(null);
  const result = useStoreRead<T>(
    key,
    async () => {
      try {
        const value = await read();
        setCause(null);
        return value;
      } catch (error) {
        setCause(error);
        throw error;
      }
    },
    { enabled: options.enabled, staleAfterMs: CRM_PARTY_STALE_MS },
  );
  const failure: unknown = result.isError ? (cause ?? new Error(result.error ?? "The read failed")) : null;
  return { ...result, cause: failure };
}
