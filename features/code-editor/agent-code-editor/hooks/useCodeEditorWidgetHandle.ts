"use client";

/**
 * useCodeEditorWidgetHandle — wraps useWidgetHandle for code-editor actions.
 *
 * The agent can either issue `widget_text_*` tool calls mid-stream (the
 * primary, typed channel) OR output SEARCH/REPLACE blocks in its response
 * text (the fallback, handled by the consumer on stream end). Both paths
 * ultimately call the editor's `onCodeChange` with new content.
 *
 * This hook only wires the tool-call channel. SEARCH/REPLACE fallback is
 * handled by `useSmartCodeEditor` on the `onComplete` lifecycle event.
 *
 * Method mapping:
 *   widget_text_replace       → onTextReplace  → setCode(text)
 *   widget_text_insert_before → onTextInsertBefore
 *   widget_text_insert_after  → onTextInsertAfter
 *   widget_text_prepend       → onTextPrepend
 *   widget_text_append        → onTextAppend
 *   widget_text_patch         → onTextPatch    → applyCodeEdits single-edit
 */

import { useMemo, useRef } from "react";
import { useWidgetHandle } from "@/features/agents/hooks/useWidgetHandle";
import type {
  WidgetHandle,
  WidgetCompletionResult,
  WidgetErrorPayload,
} from "@/features/agents/types/widget-handle.types";
import { applyCodeEdits } from "../utils/applyCodeEdits";

interface UseCodeEditorWidgetHandleArgs {
  /** Current code — ref-stable read so tool handlers see the latest value. */
  code: string;
  /** Writes new code back to the parent editor. */
  onCodeChange: (newCode: string) => void;
  /** Optional: fired when the stream ends (for SEARCH/REPLACE fallback). */
  onComplete?: (result: WidgetCompletionResult) => void;
  /** Optional: fired on widget-method or stream-level errors. */
  onError?: (err: WidgetErrorPayload) => void;
}

/**
 * Returns the `widgetHandleId` to pass on the invocation's `callbacks`.
 *
 * The underlying widget handle is registered once per mount. Internally it
 * uses getters to always read the latest code ref, so the caller can pass
 * fresh `onCodeChange` closures every render without re-registering.
 */
export function useCodeEditorWidgetHandle({
  code,
  onCodeChange,
  onComplete,
  onError,
}: UseCodeEditorWidgetHandleArgs): string {
  // Ref-stable access to the latest code + callbacks
  const codeRef = useRef(code);
  codeRef.current = code;
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Build the handle once — the useWidgetHandle hook itself wraps each
  // method in a getter that reads from refs, so this object identity is fine.
  const handle = useMemo<WidgetHandle>(
    () => ({
      onTextReplace: ({ text }) => {
        onCodeChangeRef.current(text);
      },

      onTextInsertBefore: ({ text }) => {
        onCodeChangeRef.current(text + codeRef.current);
      },

      onTextInsertAfter: ({ text }) => {
        onCodeChangeRef.current(codeRef.current + text);
      },

      onTextPrepend: ({ text }) => {
        onCodeChangeRef.current(text + codeRef.current);
      },

      onTextAppend: ({ text }) => {
        onCodeChangeRef.current(codeRef.current + text);
      },

      onTextPatch: ({ search_text, replacement_text }) => {
        const result = applyCodeEdits(codeRef.current, [
          {
            id: "widget_text_patch",
            search: search_text,
            replace: replacement_text,
          },
        ]);
        if (result.success && result.code !== undefined) {
          onCodeChangeRef.current(result.code);
        } else {
          const firstError = result.errors[0] ?? "applyCodeEdits failed";
          // Surface as a thrown error so the dispatcher reports it to the
          // server with reason:"failed" and fires handle.onError.
          throw new Error(firstError);
        }
      },

      onComplete: (result) => {
        onCompleteRef.current?.(result);
      },

      onError: (err) => {
        onErrorRef.current?.(err);
      },
    }),
    [],
  );

  return useWidgetHandle(handle);
}
