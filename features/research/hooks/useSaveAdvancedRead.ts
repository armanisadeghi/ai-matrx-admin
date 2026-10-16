"use client";

import { useCallback } from "react";

import type { AdvancedItem } from "@/features/data-sources/advanced-read";

import { runResearchAction } from "../utils/researchAction";
import { useResearchApi } from "./useResearchApi";

/**
 * The advanced reader's page lands IN the failed source: its markdown is saved as that source's
 * content (the same door "Paste" uses), then `onSaved` re-reads the topic so the row and its page
 * show the new text. A page the advanced reader could not read saves nothing.
 */
export function useSaveAdvancedRead(topicId: string, onSaved: () => void) {
  const api = useResearchApi();
  return useCallback(
    (sourceId: string) => async (item: AdvancedItem) => {
      const content = item.markdown ?? item.text;
      if (!item.ok || !content.trim()) return;
      const saved = await runResearchAction("Couldn't save the advanced read", async () => {
        await api.pasteContent(topicId, sourceId, { content, content_type: "markdown" });
        return true;
      });
      if (saved) onSaved();
    },
    [api, topicId, onSaved],
  );
}
