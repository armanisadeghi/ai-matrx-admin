"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  emitMultiFileSmartCodeEditorEvent,
  type MultiFileSmartCodeEditorWindowEvent,
} from "./callbacks";

/** `Omit` that distributes over union members (stock `Omit` collapses them). */
type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export interface FinalFileSnapshot {
  path: string;
  language: string;
  content: string;
}

/**
 * Stable emitter hook bound to a given `callbackGroupId` + `windowInstanceId`.
 * Automatically fires `ready` on mount and `window-close` on unmount.
 *
 * `getFinalFiles` is invoked at unmount to snapshot every file's final
 * content into the `window-close` event — this is the only chance the
 * caller has to observe final state before the window state is destroyed.
 */
export function useMultiFileSmartCodeEditorEmitter(
  callbackGroupId: string | undefined | null,
  windowInstanceId: string,
  getFinalFiles: () => FinalFileSnapshot[],
) {
  const groupIdRef = useRef(callbackGroupId);
  groupIdRef.current = callbackGroupId;

  const getFinalFilesRef = useRef(getFinalFiles);
  getFinalFilesRef.current = getFinalFiles;

  type EmitInput = DistributiveOmit<
    MultiFileSmartCodeEditorWindowEvent,
    "windowInstanceId"
  >;

  const emit = useCallback(
    (event: EmitInput) => {
      emitMultiFileSmartCodeEditorEvent(groupIdRef.current, {
        ...event,
        windowInstanceId,
      } as MultiFileSmartCodeEditorWindowEvent);
    },
    [windowInstanceId],
  );

  useEffect(() => {
    emit({ type: "ready" });
    return () => {
      emit({
        type: "window-close",
        finalFiles: getFinalFilesRef.current(),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({ emit }), [emit]);
}
