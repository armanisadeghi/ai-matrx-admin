"use client";

/**
 * SmartCodeEditorWindow
 *
 * Floating-window sibling of `SmartCodeEditorModal`. Wraps the
 * `SmartCodeEditor` component inside a `WindowPanel` and owns the agent
 * launch lifecycle:
 *
 *   1. On mount, register a code-editor widget handle (exposes text
 *      replace / patch / complete / error to the agent) and dispatch
 *      `launchAgentExecution` to create the conversation.
 *   2. Render `<SmartCodeEditor conversationId=... />` once the launch
 *      resolves.
 *   3. On unmount, destroy the instance via `destroyInstanceIfAllowed`.
 *
 * Event channel:
 *   External handlers are NEVER plumbed through Redux. The opener
 *   creates a callback group via `createSmartCodeEditorCallbackGroup`
 *   and passes the returned `callbackGroupId` through `openOverlay`'s
 *   `data` payload. The window emits typed events (`ready`, `launched`,
 *   `code-change`, `agent-complete`, `agent-error`, `window-close`)
 *   onto that group. See `./callbacks.ts` for the event surface.
 *
 * Ephemerality:
 *   Registered as `ephemeral: true` in `windowRegistry.ts` — live agent
 *   conversations cannot be restored across reloads, so persisting
 *   would create confusingly empty windows.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { launchAgentExecution } from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations/conversations.thunks";
import { SmartCodeEditor } from "@/features/code-editor/agent-code-editor/components/SmartCodeEditor";
import { useCodeEditorWidgetHandle } from "@/features/code-editor/agent-code-editor/hooks/useCodeEditorWidgetHandle";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "@/features/code-editor/agent-code-editor/constants";
import { useSmartCodeEditorEmitter } from "./useSmartCodeEditorEmitter";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SmartCodeEditorWindowProps {
  /** Overlay instanceId — stable across re-renders, unique per window. */
  windowInstanceId: string;
  /** Callback group from the caller (via `useOpenSmartCodeEditorWindow`). */
  callbackGroupId?: string | null;

  // From overlay `data`:
  /** Agent UUID to launch for this editor session. Required. */
  agentId: string;
  /** Starting editor content. */
  initialCode?: string;
  /** Language identifier (e.g. "typescript"). */
  language?: string;
  /** Optional vsc_active_file_path context. */
  filePath?: string;
  /** Optional vsc_selected_text context. */
  selection?: string;
  /** Optional vsc_diagnostics context (pre-formatted text). */
  diagnostics?: string;
  /** Editor header title (also used as the WindowPanel title). */
  title?: string | null;
  /** Optional per-turn variable seed forwarded to `launchAgentExecution`. */
  variables?: Record<string, unknown> | null;

  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartCodeEditorWindow({
  windowInstanceId,
  callbackGroupId,
  agentId,
  initialCode = "",
  language = "plaintext",
  filePath,
  selection,
  diagnostics,
  title,
  variables,
  onClose,
}: SmartCodeEditorWindowProps) {
  const dispatch = useAppDispatch();

  // Live code state — owned by the window so the widget handle and the
  // emitter both see the latest value without prop-drilling from outside.
  const [code, setCode] = useState<string>(initialCode);

  // Keep latest code in a ref for ref-based consumers (emitter unmount).
  const codeRef = useRef(code);
  codeRef.current = code;

  // ── Launch lifecycle state (ref declared early so widget callbacks can read it) ──
  const [conversationId, setConversationId] = useState<string | null>(null);
  const launchedIdRef = useRef<string | null>(null);

  // ── Emitter (bookends + typed events) ─────────────────────────────────────
  const { emit } = useSmartCodeEditorEmitter(
    callbackGroupId,
    windowInstanceId,
    () => codeRef.current,
  );

  // ── Code mutation pipeline ────────────────────────────────────────────────
  // Every mutation routes through here: from the agent's widget-handle calls,
  // from the SmartCodeEditor's "Apply" action, and from any future in-window
  // manual editors. We update local state AND emit `code-change`.
  const handleCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      emit({ type: "code-change", code: next });
    },
    [emit],
  );

  // ── Widget handle (agent tool-call surface) ───────────────────────────────
  // Registered ONCE per window mount. The handle is ref-stable: its
  // `onTextReplace` / `onTextPatch` read the latest `code` + `onCodeChange`
  // via refs inside `useCodeEditorWidgetHandle`.
  const widgetHandleId = useCodeEditorWidgetHandle({
    code,
    onCodeChange: handleCodeChange,
    onComplete: (result) => {
      emit({
        type: "agent-complete",
        conversationId: launchedIdRef.current ?? "",
        finalCode: codeRef.current,
      });
      void result;
    },
    onError: (err) => {
      emit({
        type: "agent-error",
        message:
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Unknown agent error",
      });
    },
  });

  // Snapshot variables in a ref so mounting doesn't re-fire on reference churn.
  const variablesRef = useRef(variables);
  variablesRef.current = variables;

  useEffect(() => {
    if (launchedIdRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await dispatch(
          launchAgentExecution({
            agentId,
            surfaceKey: SMART_CODE_EDITOR_SURFACE_KEY,
            sourceFeature: "code-editor",
            displayMode: "direct",
            autoRun: false,
            allowChat: true,
            apiEndpointMode: "agent",
            widgetHandleId,
            ...(variablesRef.current
              ? { variables: variablesRef.current }
              : {}),
          }),
        ).unwrap();

        if (cancelled) {
          // Window closed before launch resolved — tear down the stray instance.
          dispatch(destroyInstanceIfAllowed(result.conversationId));
          return;
        }

        launchedIdRef.current = result.conversationId;
        setConversationId(result.conversationId);
        emit({ type: "launched", conversationId: result.conversationId });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SmartCodeEditorWindow] launch failed", err);
        emit({
          type: "agent-error",
          message:
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Failed to launch agent",
        });
      }
    })();

    return () => {
      cancelled = true;
      // Destroy on unmount — the window is ephemeral and any live
      // conversation must be torn down to release execution resources.
      const id = launchedIdRef.current;
      if (id) {
        launchedIdRef.current = null;
        dispatch(destroyInstanceIfAllowed(id));
      }
    };
  }, [agentId, widgetHandleId, dispatch, emit]);

  // ── Persistence collect (ephemeral, but called by WindowPanel) ───────────
  const collectData = useCallback(
    (): Record<string, unknown> => ({
      // callbackGroupId is intentionally omitted — live callbacks do not
      // survive a reload. agentId + language are kept so the entry is
      // self-describing even though the window is ephemeral.
      agentId,
      language,
      title: title ?? null,
    }),
    [agentId, language, title],
  );

  return (
    <WindowPanel
      id={`smart-code-editor-window-${windowInstanceId}`}
      title={title ?? "Smart Code Editor"}
      overlayId="smartCodeEditorWindow"
      minWidth={640}
      minHeight={420}
      width={1100}
      height={720}
      position="center"
      onClose={onClose}
      onCollectData={collectData}
      bodyClassName="p-0 overflow-hidden"
    >
      {conversationId ? (
        <SmartCodeEditor
          conversationId={conversationId}
          currentCode={code}
          language={language}
          onCodeChange={handleCodeChange}
          filePath={filePath}
          selection={selection}
          diagnostics={diagnostics}
          title={title ?? undefined}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Launching agent…
        </div>
      )}
    </WindowPanel>
  );
}

export default SmartCodeEditorWindow;
