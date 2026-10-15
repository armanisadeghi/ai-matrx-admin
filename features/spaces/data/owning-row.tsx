"use client";

// features/spaces/data/owning-row.tsx — the row a page belongs to, for "This page's row" views.
//
// The editor provides the page's id (<PageOfBlocks>); a database block whose view uses the token asks
// `content.space_owning_row` ONCE per page per load (a page with no such view asks nothing — load law).
// The answer is the row id, never its values: the block then reads the related rows as the person.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { createClient } from "@/utils/supabase/client";

export interface OwningRow {
  recordId: string;
  tableId: string;
  organizationId: string;
}

const PageOfBlocks = createContext<string | null>(null);

/** The page whose blocks render below (set by the editor). */
export function PageOfBlocksProvider({ spaceId, children }: { spaceId: string; children: ReactNode }) {
  return <PageOfBlocks.Provider value={spaceId}>{children}</PageOfBlocks.Provider>;
}

export function usePageOfBlocks(): string | null {
  return useContext(PageOfBlocks);
}

const asked = new Map<string, Promise<OwningRow | null>>();

/** Ask once per page per load; a failed ask is reported and not kept (the next mount asks again). */
export function readOwningRow(spaceId: string): Promise<OwningRow | null> {
  const kept = asked.get(spaceId);
  if (kept) return kept;
  const ask = (async () => {
    const { data, error } = await (createClient().schema("content") as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ record_id: string; table_id: string; organization_id: string }> | null; error: { code?: string; message: string } | null }>;
    }).rpc("space_owning_row", { p_space_id: spaceId });
    if (error) {
      asked.delete(spaceId);
      captureError({
        source: "supabase-postgrest",
        operation: "rpc",
        schema: "content",
        relation: "space_owning_row",
        code: error.code,
        message: `The page's row could not be read: ${error.message}`,
        callSite: "features/spaces/data/owning-row.tsx readOwningRow",
      });
      throw new Error(error.message);
    }
    const row = data?.[0];
    return row ? { recordId: row.record_id, tableId: row.table_id, organizationId: row.organization_id } : null;
  })();
  asked.set(spaceId, ask);
  return ask;
}

/** A page whose row was just given (its page made this moment): later asks answer at once. */
export function primeOwningRow(spaceId: string, row: OwningRow): void {
  asked.set(spaceId, Promise.resolve(row));
}

export type OwningRowState = { state: "idle" } | { state: "loading" } | { state: "found"; row: OwningRow } | { state: "none" } | { state: "failed"; message: string };

/** The page's row, asked only when `needed` (the active view uses the token). */
export function useOwningRow(needed: boolean): OwningRowState {
  const spaceId = usePageOfBlocks();
  const [answer, setAnswer] = useState<{ key: string; state: OwningRowState } | null>(null);
  const key = needed && spaceId ? spaceId : "";
  useEffect(() => {
    if (!key) return;
    let live = true;
    readOwningRow(key).then(
      (row) => live && setAnswer({ key, state: row ? { state: "found", row } : { state: "none" } }),
      (err: unknown) => live && setAnswer({ key, state: { state: "failed", message: err instanceof Error ? err.message : String(err) } }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  if (!needed) return { state: "idle" };
  // Outside a page (a block drawn with no editor around it) there is no row to find.
  if (!spaceId) return { state: "none" };
  return answer?.key === key ? answer.state : { state: "loading" };
}
