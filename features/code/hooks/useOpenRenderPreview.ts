"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { openTab, setActiveTab } from "../redux/tabsSlice";
import {
  hasRenderPreviewerForTabId,
  renderPreviewTabId,
} from "../preview/renderPreviewRegistry";

/**
 * Open (or focus) the render-preview tab paired to a source tab. Idempotent:
 * if the preview tab already exists it is just activated. If no previewer is
 * registered for the source tab's library-source prefix the call is a no-op
 * and resolves to `false`.
 */
export function useOpenRenderPreview() {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(
    (sourceTabId: string): boolean => {
      const state = store.getState();
      const sourceTab = state.codeTabs?.byId?.[sourceTabId];
      if (!sourceTab) return false;
      if (!hasRenderPreviewerForTabId(sourceTabId)) return false;

      const previewId = renderPreviewTabId(sourceTabId);
      if (state.codeTabs?.byId?.[previewId]) {
        dispatch(setActiveTab(previewId));
        return true;
      }

      dispatch(
        openTab({
          id: previewId,
          path: `${sourceTab.path}::preview`,
          name: `Preview · ${sourceTab.name}`,
          language: sourceTab.language,
          content: "",
          pristineContent: "",
          kind: "render-preview",
          renderSourceTabId: sourceTabId,
        }),
      );
      return true;
    },
    [dispatch, store],
  );
}
