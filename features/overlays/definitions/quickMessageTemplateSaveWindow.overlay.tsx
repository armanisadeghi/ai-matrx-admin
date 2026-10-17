"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import type { MessageRole } from "@/features/message-templates/types/message-templates-db";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "quickMessageTemplateSaveWindow" as const;

export interface OpenQuickMessageTemplateSaveWindowOptions {
  initialContent: string;
  defaultName?: string;
  defaultRole?: MessageRole;
}

export function useOpenQuickMessageTemplateSaveWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenQuickMessageTemplateSaveWindowOptions) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: options }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function QuickMessageTemplateSaveWindowController(
  props: OpenQuickMessageTemplateSaveWindowOptions,
): null {
  const open = useOpenQuickMessageTemplateSaveWindow();
  useEffect(() => {
    const handle = open(props);
    return () => {
      handle.close();
    };
  }, [open, props.initialContent, props.defaultName, props.defaultRole]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type QuickMessageTemplateSaveWindowDefinitionData = OpenQuickMessageTemplateSaveWindowOptions;

export const quickMessageTemplateSaveWindowOverlay = defineOverlay<QuickMessageTemplateSaveWindowDefinitionData>()({
  id: "quickMessageTemplateSaveWindow",
  label: "Save as Message Template",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialContent: "", defaultRole: "assistant" },
    windowId: "quick-message-template-save-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickMessageTemplateSaveWindow: UntypedOverlayWire;
  }
}
