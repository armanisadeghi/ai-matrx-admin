"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createStorageSourcePickerCallbackGroup,
  type StorageSourcePickerHandlers,
} from "./callbacks/storageSourcePicker";
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

export type StorageSourcePickerDefinitionData = OpenStorageSourcePickerOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    storageSourcePicker: OverlayWire<StorageSourcePickerDefinitionData>;
  }
}
