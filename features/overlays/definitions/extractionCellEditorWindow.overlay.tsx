"use client";

/**
 * Opener for `extractionCellEditorWindow` — edit one extraction dataset cell
 * in a floating WindowPanel (edit / split / preview).
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import {
  createExtractionCellEditorCallbackGroup,
  extractionCellEditorInstanceId,
  type ExtractionCellEditorHandlers,
  type ExtractionCellEditorTargetInput,
} from "@/features/page-extraction/data-review/extractionCellEditorCallbacks";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "extractionCellEditorWindow" as const;

export type OpenExtractionCellEditorOptions = ExtractionCellEditorTargetInput & {
  callbackGroupId?: string;
};

export interface ExtractionCellEditorHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenExtractionCellEditor(
  handlers?: ExtractionCellEditorHandlers,
) {
  const dispatch = useAppDispatch();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const groupRef = useRef<ReturnType<
    typeof createExtractionCellEditorCallbackGroup
  > | null>(null);

  useEffect(() => {
    groupRef.current = createExtractionCellEditorCallbackGroup({
      onSaved: (e) => handlersRef.current?.onSaved?.(e),
      onWindowClose: (e) => handlersRef.current?.onWindowClose?.(e),
    });
    return () => {
      groupRef.current?.dispose();
      groupRef.current = null;
    };
  }, []);

  return useCallback(
    (opts: OpenExtractionCellEditorOptions): ExtractionCellEditorHandle => {
      const instanceId = extractionCellEditorInstanceId(
        opts.rowId,
        opts.columnKey,
      );
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: opts.readOnly ? {
            rowId: opts.rowId,
            columnKey: opts.columnKey,
            columnLabel: opts.columnLabel,
            pageLabel: opts.pageLabel,
            value: opts.value,
            readOnly: true,
            callbackGroupId:
              opts.callbackGroupId ?? groupRef.current?.callbackGroupId ?? null,
          } : {
            rowId: opts.rowId,
            columnKey: opts.columnKey,
            columnLabel: opts.columnLabel,
            pageLabel: opts.pageLabel,
            value: opts.value,
            readOnly: false,
            writeKey: opts.writeKey,
            currentPayload: opts.currentPayload,
            callbackGroupId:
              opts.callbackGroupId ?? groupRef.current?.callbackGroupId ?? null,
          },
        }),
      );
      return {
        instanceId,
        close: () =>
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ExtractionCellEditorWindowDefinitionData = OpenExtractionCellEditorOptions;

export const extractionCellEditorWindowOverlay = defineOverlay<ExtractionCellEditorWindowDefinitionData>()({
  id: "extractionCellEditorWindow",
  label: "Extraction Cell Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          rowId: null,
          columnKey: null,
          columnLabel: "",
          pageLabel: "",
          value: "",
          readOnly: false,
          writeKey: null,
          currentPayload: {},
          callbackGroupId: null,
        },
    windowId: "extraction-cell-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./extractionCellEditorWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    extractionCellEditorWindow: OverlayWire<ExtractionCellEditorWindowDefinitionData>;
  }
}
