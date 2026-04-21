"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  emitSmartCodeEditorEvent,
  type SmartCodeEditorWindowEvent,
} from "./callbacks";

/** `Omit` that distributes over union members (stock `Omit` collapses them). */
type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

/**
 * Stable emitter hook bound to a given `callbackGroupId` + `windowInstanceId`.
 * Automatically fires `ready` on mount and `window-close` on unmount.
 *
 * Used inside `SmartCodeEditorWindow` to push events to callers without
 * plumbing any handler functions through Redux.
 */
export function useSmartCodeEditorEmitter(
  callbackGroupId: string | undefined | null,
  windowInstanceId: string,
  getFinalCode: () => string,
) {
  const groupIdRef = useRef(callbackGroupId);
  groupIdRef.current = callbackGroupId;

  const getFinalCodeRef = useRef(getFinalCode);
  getFinalCodeRef.current = getFinalCode;

  type EmitInput = DistributiveOmit<
    SmartCodeEditorWindowEvent,
    "windowInstanceId"
  >;

  const emit = useCallback(
    (event: EmitInput) => {
      emitSmartCodeEditorEvent(groupIdRef.current, {
        ...event,
        windowInstanceId,
      } as SmartCodeEditorWindowEvent);
    },
    [windowInstanceId],
  );

  useEffect(() => {
    emit({ type: "ready" });
    return () => {
      emit({ type: "window-close", finalCode: getFinalCodeRef.current() });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({ emit }), [emit]);
}
