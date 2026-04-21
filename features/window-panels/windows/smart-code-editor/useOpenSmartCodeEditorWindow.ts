"use client";

/**
 * useOpenSmartCodeEditorWindow
 *
 * Imperative helper that opens a `SmartCodeEditorWindow` and ties the
 * caller's handlers to a callback group automatically. Returns a handle
 * that can close the window or just detach the listeners.
 *
 * Usage:
 *
 *   const openSmartEditor = useOpenSmartCodeEditorWindow();
 *   const handle = openSmartEditor({
 *     agentId: "<agent-uuid>",
 *     initialCode,
 *     language: "typescript",
 *     onCodeChange: (e) => setCode(e.code),
 *     onWindowClose: (e) => console.log("final:", e.finalCode),
 *   });
 *   // ...later...
 *   handle.close();
 *
 * The `callbackGroupId` is threaded through the overlay's `data` payload
 * — no handler functions ever enter Redux.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay, closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  createSmartCodeEditorCallbackGroup,
  type SmartCodeEditorWindowHandlers,
} from "./callbacks";

export interface OpenSmartCodeEditorWindowOptions extends SmartCodeEditorWindowHandlers {
  /**
   * Stable instance id. Omit to get a fresh, unique window every call
   * (recommended for "edit this snippet" style flows).
   */
  windowInstanceId?: string;

  /** Agent UUID to launch. Required. */
  agentId: string;
  /** Starting editor content. Defaults to empty string. */
  initialCode?: string;
  /** Language identifier (e.g. "typescript"). Defaults to "plaintext". */
  language?: string;
  /** Optional vsc_active_file_path context. */
  filePath?: string;
  /** Optional vsc_selected_text context. */
  selection?: string;
  /** Optional vsc_diagnostics context (pre-formatted text). */
  diagnostics?: string;
  /** Editor header + WindowPanel title. */
  title?: string | null;
  /** Optional per-turn variable seed forwarded to `launchAgentExecution`. */
  variables?: Record<string, unknown>;
}

const OVERLAY_ID = "smartCodeEditorWindow";

type HandleRef = {
  instanceId: string;
  callbackGroupId: string;
  dispose: () => void;
};

export interface SmartCodeEditorWindowHandle {
  overlayId: string;
  instanceId: string;
  callbackGroupId: string;
  /** Close the window AND dispose the callback group. */
  close: () => void;
  /** Dispose the callback group only (leave the window open). */
  dispose: () => void;
}

export function useOpenSmartCodeEditorWindow() {
  const dispatch = useAppDispatch();
  const handlesRef = useRef<Set<HandleRef>>(new Set());

  // If the caller unmounts while windows are still open, detach their
  // callback groups so handler closures can be GC'd. The overlay state
  // itself stays in Redux until the window is closed.
  useEffect(() => {
    const handles = handlesRef.current;
    return () => {
      for (const h of handles) h.dispose();
      handles.clear();
    };
  }, []);

  const open = useCallback(
    (
      options: OpenSmartCodeEditorWindowOptions,
    ): SmartCodeEditorWindowHandle => {
      const instanceId =
        options.windowInstanceId ?? `${OVERLAY_ID}-${Date.now()}`;

      const { callbackGroupId, dispose } = createSmartCodeEditorCallbackGroup({
        onReady: options.onReady,
        onLaunched: options.onLaunched,
        onCodeChange: options.onCodeChange,
        onAgentComplete: options.onAgentComplete,
        onAgentError: options.onAgentError,
        onWindowClose: options.onWindowClose,
        onEvent: options.onEvent,
      });

      const data: Record<string, unknown> = {
        callbackGroupId,
        agentId: options.agentId,
        initialCode: options.initialCode ?? "",
        language: options.language ?? "plaintext",
        title: options.title ?? null,
      };
      if (options.filePath !== undefined) data.filePath = options.filePath;
      if (options.selection !== undefined) data.selection = options.selection;
      if (options.diagnostics !== undefined)
        data.diagnostics = options.diagnostics;
      if (options.variables !== undefined) data.variables = options.variables;

      dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId, data }));

      const handleRef: HandleRef = { instanceId, callbackGroupId, dispose };
      handlesRef.current.add(handleRef);

      const close = () => {
        dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
        dispose();
        handlesRef.current.delete(handleRef);
      };

      const detach = () => {
        dispose();
        handlesRef.current.delete(handleRef);
      };

      return {
        overlayId: OVERLAY_ID,
        instanceId,
        callbackGroupId,
        close,
        dispose: detach,
      };
    },
    [dispatch],
  );

  return open;
}
