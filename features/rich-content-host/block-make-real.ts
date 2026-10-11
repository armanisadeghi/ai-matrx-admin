"use client";
/**
 * The ONE door from a structured block in an answer to a real record: a note (the platform's
 * quick-save window, same as every "Save to Notes") or a CRM contact (the governed save dialog
 * the rich-document "Save as contact" opens). Blocks call these — they never open their own.
 */
import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

export function useBlockMakeReal() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      saveToNotes(title: string, markdown: string) {
        dispatch(
          openOverlay({
            overlayId: "quickNoteSaveWindow",
            data: { initialContent: markdown, defaultNoteName: title, initialEditorMode: undefined },
          }),
        );
      },
      saveAsContact(text: string) {
        dispatch(
          openOverlay({
            overlayId: "saveContactFromSelection",
            data: {
              selection: text,
              origin: typeof window !== "undefined" ? `Saved from ${window.location.pathname}` : "Saved from an answer",
            },
          }),
        );
      },
    }),
    [dispatch],
  );
}
