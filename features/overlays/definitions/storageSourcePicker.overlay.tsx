"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  createStorageSourcePickerCallbackGroup,
  type StorageSourcePickerHandlers,
} from "./callbacks/storageSourcePicker";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "storageSourcePicker" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
      opener.open(dispatch, { data: {
            callbackGroupId: callbacks.callbackGroupId,
            destinationFolderPath: options.destinationFolderPath,
            accept: options.accept ?? null,
            multiple: options.multiple ?? true,
          } });
      return {
        close: () => dispatch(opener.close()),
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
