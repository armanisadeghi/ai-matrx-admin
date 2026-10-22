"use client";

/**
 * Typed, callback-aware opener for the multi-instance annotation window.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createImageAnnotationCallbackGroup,
  type ImageAnnotationWindowData,
  type ImageAnnotationWindowHandlers,
} from "./callbacks/imageAnnotationWindow";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "imageAnnotationWindow" as const;

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
        `${OVERLAY_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data,
        }),
      );


      const close = () => {
        dispatch(
          closeOverlay({
            overlayId: OVERLAY_ID,
            instanceId,
          }),
        );
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

export function ImageAnnotationWindowController(
  props: OpenImageAnnotationWindowOptions,
): null {
  const open = useOpenImageAnnotationWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [
    open,
    props.windowInstanceId,
    props.sourceFileId,
    props.sourceUrl,
    props.sourceFilename,
    props.defaultFolder,
    props.title,
    props.overwriteSource,
  ]);
  return null;
}

export type ImageAnnotationWindowDefinitionData = OpenImageAnnotationWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    imageAnnotationWindow: UntypedOverlayWire;
  }
}
