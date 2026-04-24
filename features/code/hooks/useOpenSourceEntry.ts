"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { openTab, setActiveTab } from "../redux/tabsSlice";
import { getLibrarySource } from "../library-sources";

/**
 * Open a row from any registered library source as an editor tab. The
 * caller supplies `sourceId` (e.g. "prompt_apps"), the row's primary key
 * and, for multi-column sources, a `fieldId` identifying which column to
 * edit.
 *
 * Already-open tabs are focused without a refetch. Newly opened tabs
 * capture the row's `updated_at` so the save path can guard against
 * remote overwrites.
 */
export function useOpenSourceEntry() {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(
    async (args: {
      sourceId: string;
      rowId: string;
      fieldId?: string;
    }): Promise<void> => {
      const adapter = getLibrarySource(args.sourceId);
      if (!adapter) {
        throw new Error(`Unknown library source "${args.sourceId}"`);
      }

      const tabId = adapter.makeTabId(args.rowId, args.fieldId);

      // Short-circuit: already open → focus.
      const state = store.getState();
      if (state.codeTabs?.byId?.[tabId]) {
        dispatch(setActiveTab(tabId));
        return;
      }

      const supabase = createClient();
      const loaded = await adapter.load(supabase, args.rowId, args.fieldId);

      dispatch(
        openTab({
          id: tabId,
          path: loaded.path,
          name: loaded.name,
          language: loaded.language,
          content: loaded.content,
          pristineContent: loaded.content,
          remoteUpdatedAt: loaded.updatedAt,
        }),
      );
    },
    [dispatch, store],
  );
}
