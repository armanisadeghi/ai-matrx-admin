"use client";

/**
 * Typed, callback-aware opener for the multi-instance annotation window.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { mintInstanceId } from "@ai-matrx/summon/open";
import {
  createImageAnnotationCallbackGroup,
  type ImageAnnotationWindowData,
  type ImageAnnotationWindowHandlers,
} from "./callbacks/imageAnnotationWindow";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "imageAnnotationWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenImageAnnotationWindowOptions
  extends ImageAnnotationWindowHandlers {
  windowInstanceId?: string;
  sourceFileId?: string | null;
  sourceUrl?: string | null;
  sourceFilename?: string | null;
  defaultFolder?: string | null;
  title?: string | null;
  overwriteSource?: boolean;
}

export interface ImageAnnotationWindowHandle {
  instanceId: string;
  callbackGroupId: string;
  close: () => void;
  dispose: () => void;
}

export function useOpenImageAnnotationWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (
      options: OpenImageAnnotationWindowOptions = {},
    ): ImageAnnotationWindowHandle => {
      const instanceId =
        options.windowInstanceId ??
        mintInstanceId(OVERLAY_ID);
      // The window closing itself releases its group (the window owns it).
      const { callbackGroupId, dispose } = createImageAnnotationCallbackGroup({
        ...options,
        onWindowClose: (event) => {
          options.onWindowClose?.(event);
          dispose();
        },
      });
      const data: ImageAnnotationWindowData = {
        callbackGroupId,
        sourceFileId: options.sourceFileId ?? null,
        sourceUrl: options.sourceUrl ?? null,
        sourceFilename: options.sourceFilename ?? null,
        defaultFolder: options.defaultFolder ?? null,
        title: options.title ?? null,
        overwriteSource: options.overwriteSource ?? false,
      };

      opener.open(dispatch, { instanceId, data });


      const close = () => {
        dispatch(opener.close(instanceId));
        dispose();
      };

      const detach = () => {
        dispose();
      };

      return {
        instanceId,
        callbackGroupId,
        close,
        dispose: detach,
      };
    },
    [dispatch],
  );
}

export const ImageAnnotationWindowController = hookController<OpenImageAnnotationWindowOptions>(useOpenImageAnnotationWindow);

export type ImageAnnotationWindowDefinitionData = OpenImageAnnotationWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    imageAnnotationWindow: UntypedOverlayWire;
  }
}
