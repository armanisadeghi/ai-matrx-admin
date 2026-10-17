"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import {
  createStorageSourcePickerCallbackGroup,
  type StorageSourcePickerHandlers,
} from "./callbacks/storageSourcePicker";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "storageSourcePicker" as const;

export interface OpenStorageSourcePickerOptions
  extends StorageSourcePickerHandlers {
  destinationFolderPath: string;
  accept?: string;
  multiple?: boolean;
}

export function useOpenStorageSourcePicker() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenStorageSourcePickerOptions) => {
      const callbacks = createStorageSourcePickerCallbackGroup(options);
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            callbackGroupId: callbacks.callbackGroupId,
            destinationFolderPath: options.destinationFolderPath,
            accept: options.accept ?? null,
            multiple: options.multiple ?? true,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
        dispose: callbacks.dispose,
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type StorageSourcePickerDefinitionData = OpenStorageSourcePickerOptions;

export const storageSourcePickerOverlay = defineOverlay<StorageSourcePickerDefinitionData>()({
  id: "storageSourcePicker",
  label: "Import from cloud storage",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null,
          destinationFolderPath: "",
          accept: null,
          multiple: true,
        },
    windowId: "storage-source-picker",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    storageSourcePicker: OverlayWire<StorageSourcePickerDefinitionData>;
  }
}
