"use client";

/**
 * SmartCodeEditorModal — Dialog wrapper that owns the conversation lifecycle.
 *
 * Props are drop-in API-compatible with the legacy `AICodeEditorModal`,
 * except:
 *   - `promptKey` / `builtinId` → `agentId` (the agent UUID to launch)
 *   - `allowPromptSelection` → (not yet supported; use a known agentId)
 *
 * Responsibilities:
 *   1. On open: register a code-editor widget handle (wired to our code
 *      mutations) and dispatch `launchAgentExecution({agentId, callbacks:
 *      {widgetHandleId}})` to create the conversation.
 *   2. Render `<Dialog>` → `<SmartCodeEditor conversationId={...} />`.
 *   3. On close: dispatch `destroyInstanceIfAllowed(conversationId)`.
 *
 * The inner `SmartCodeEditor` knows nothing about launch — it just reads
 * selectors off the conversation it was given.
 */

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppDispatch } from "@/lib/redux/hooks";
import { launchAgentExecution } from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations/conversations.thunks";
import { SmartCodeEditor } from "./SmartCodeEditor";
import { useCodeEditorWidgetHandle } from "../hooks/useCodeEditorWidgetHandle";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "../constants";

export interface SmartCodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current editor code — read-in baseline and widget handle target. */
  currentCode: string;
  language: string;
  /** Agent UUID to run. Replaces the legacy `builtinId`. */
  agentId: string;
  /** Writes new code back to the parent after Apply or a widget mutation. */
  onCodeChange: (newCode: string) => void;
  /** Optional selection text (feeds vsc_selected_text). */
  selection?: string;
  /** Optional file path (feeds vsc_active_file_path). */
  filePath?: string;
  /** Optional pre-formatted diagnostics (feeds vsc_diagnostics). */
  diagnostics?: string;
  /** Optional title shown in the editor's header. */
  title?: string;
  /**
   * Optional per-turn variable values. Forwarded to `launchAgentExecution`
   * as the first-turn variable seed (maps to `setUserVariableValues`).
   *
   * This is a generic data pipe — callers decide which variable names map
   * to which code inputs. The Smart Code Editor itself does NOT bake in
   * any knowledge of specific variable names; that's the caller's job
   * (typically via a Shortcut's scopeMappings in production, or a manual
   * mapping object in demo/test surfaces).
   */
  variables?: Record<string, unknown>;
}

export function SmartCodeEditorModal({
  open,
  onOpenChange,
  currentCode,
  language,
  agentId,
  onCodeChange,
  selection,
  filePath,
  diagnostics,
  title,
  variables,
}: SmartCodeEditorModalProps) {
  const dispatch = useAppDispatch();

  // Register the widget handle once per mount. The handle is ref-stable —
  // even when `currentCode` / `onCodeChange` change between renders, the
  // handle sees the latest values (getters read refs internally).
  const widgetHandleId = useCodeEditorWidgetHandle({
    code: currentCode,
    onCodeChange,
  });

  const [conversationId, setConversationId] = useState<string | null>(null);
  const launchedIdRef = useRef<string | null>(null);

  // Snapshot variables in a ref so the launch effect reads the latest value
  // without being gated on variable-reference changes (which would relaunch).
  const variablesRef = useRef(variables);
  variablesRef.current = variables;

  // ── Launch on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
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
            // Seed first-turn variables. The caller owns the mapping —
            // typically a shortcut's scopeMappings, or a manual map in demo
            // surfaces. See SmartCodeEditor README for the contract.
            ...(variablesRef.current
              ? { variables: variablesRef.current }
              : {}),
          }),
        ).unwrap();

        if (cancelled) {
          // Modal closed before launch resolved — tear down the stray instance.
          dispatch(destroyInstanceIfAllowed(result.conversationId));
          return;
        }

        launchedIdRef.current = result.conversationId;
        setConversationId(result.conversationId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SmartCodeEditorModal] launch failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agentId, widgetHandleId, dispatch]);

  // ── Cleanup on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (open) return;
    if (!launchedIdRef.current) return;

    const id = launchedIdRef.current;
    launchedIdRef.current = null;
    setConversationId(null);
    dispatch(destroyInstanceIfAllowed(id));
  }, [open, dispatch]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90dvh] p-0 gap-0">
        {conversationId ? (
          <SmartCodeEditor
            conversationId={conversationId}
            currentCode={currentCode}
            language={language}
            onCodeChange={onCodeChange}
            filePath={filePath}
            selection={selection}
            diagnostics={diagnostics}
            title={title}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Launching agent…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
