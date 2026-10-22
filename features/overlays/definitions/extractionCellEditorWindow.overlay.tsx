"use client";

/**
 * Opener for `extractionCellEditorWindow` — edit one extraction dataset cell
 * in a floating WindowPanel (edit / split / preview).
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createExtractionCellEditorCallbackGroup,
  extractionCellEditorInstanceId,
  type ExtractionCellEditorHandlers,
  type ExtractionCellEditorTargetInput,
} from "@/features/page-extraction/data-review/extractionCellEditorCallbacks";
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

  // The opened window owns its callback group: one per open, released when the window closes
  // itself — never dropped when this hook's component unmounts (a menu or sheet that opened the
  // editor unmounts first; an-opened-window-owns-its-callback-group.test.ts).
  const groupFor = () => {
    const group = createExtractionCellEditorCallbackGroup({
      onSaved: (e) => handlersRef.current?.onSaved?.(e),
      onWindowClose: (e) => {
        handlersRef.current?.onWindowClose?.(e);
        group.dispose();
      },
    });
    return group;
  };

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
              opts.callbackGroupId ?? groupFor().callbackGroupId,
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
              opts.callbackGroupId ?? groupFor().callbackGroupId,
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

export type ExtractionCellEditorWindowDefinitionData = OpenExtractionCellEditorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    extractionCellEditorWindow: OverlayWire<ExtractionCellEditorWindowDefinitionData>;
  }
}
