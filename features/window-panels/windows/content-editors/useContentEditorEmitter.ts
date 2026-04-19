"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  emitContentEditorEvent,
  type ContentEditorWindowEvent,
} from "./callbacks";

/** `Omit` that distributes over union members (stock `Omit` collapses them). */
type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

/**
 * Hook used INSIDE a content-editor window to produce a stable emitter bound
 * to a given `callbackGroupId` and `windowInstanceId`. Automatically fires
 * `ready` on mount and `window-close` on unmount.
 *
 * All emitted events include `windowInstanceId` so a single caller can demux
 * events from multiple simultaneously-open windows.
 */
export function useContentEditorEmitter(
  callbackGroupId: string | undefined | null,
  windowInstanceId: string,
) {
  // Keep the groupId in a ref so closures below stay stable across re-renders.
  const groupIdRef = useRef(callbackGroupId);
  groupIdRef.current = callbackGroupId;

  type EmitInput = DistributiveOmit<
    ContentEditorWindowEvent,
    "windowInstanceId"
  >;

  const emit = useCallback(
    (event: EmitInput) => {
      emitContentEditorEvent(groupIdRef.current, {
        ...event,
        windowInstanceId,
      } as ContentEditorWindowEvent);
    },
    [windowInstanceId],
  );

  // Fire ready / window-close bookends.
  useEffect(() => {
    emit({ type: "ready" });
    return () => {
      emit({ type: "window-close" });
    };
    // We only want this to run for the lifetime of the window instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({ emit }), [emit]);
}
