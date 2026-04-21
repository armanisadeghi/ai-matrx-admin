"use client";

/**
 * SmartCodeEditorModal — Dialog wrapper that owns the conversation lifecycle.
 *
 * Launch is a single imperative call through `useAgentLauncher`. The agent's
 * execution payload is loaded by `launchAgentExecution` internally if not
 * already in Redux — no caller-side preload needed.
 */

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations/conversations.thunks";
import { SmartCodeEditor } from "./SmartCodeEditor";
import { useCodeEditorWidgetHandle } from "../hooks/useCodeEditorWidgetHandle";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "../constants";

export interface SmartCodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCode: string;
  language: string;
  /** Agent UUID to run. */
  agentId: string;
  /** Writes new code back after Apply or a widget mutation. */
  onCodeChange: (newCode: string) => void;
  /** Optional selection text (feeds vsc_selected_text). */
  selection?: string;
  /** Optional file path (feeds vsc_active_file_path). */
  filePath?: string;
  /** Optional pre-formatted diagnostics (feeds vsc_diagnostics). */
  diagnostics?: string;
  /** Optional workspace name (feeds vsc_workspace_name). */
  workspaceName?: string;
  /** Optional workspace folders, newline-joined (feeds vsc_workspace_folders). */
  workspaceFolders?: string;
  /** Optional git branch (feeds vsc_git_branch). */
  gitBranch?: string;
  /** Optional git status (feeds vsc_git_status). */
  gitStatus?: string;
  /** Optional agent skills free-form text (feeds agent_skills). */
  agentSkills?: string;
  /** Title shown in the editor's header. */
  title?: string;
  /**
   * First-turn variable values. Caller owns the mapping — typically a
   * shortcut's scopeMappings in production, or a manual map in demo surfaces.
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
  workspaceName,
  workspaceFolders,
  gitBranch,
  gitStatus,
  agentSkills,
  title,
  variables,
}: SmartCodeEditorModalProps) {
  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();

  const widgetHandleId = useCodeEditorWidgetHandle({
    code: currentCode,
    onCodeChange,
  });

  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let createdId: string | null = null;

    launchAgent(agentId, {
      surfaceKey: SMART_CODE_EDITOR_SURFACE_KEY,
      sourceFeature: "code-editor",
      displayMode: "direct",
      autoRun: false,
      allowChat: true,
      apiEndpointMode: "agent",
      widgetHandleId,
      variables,
    })
      .then((result) => {
        if (cancelled) {
          dispatch(destroyInstanceIfAllowed(result.conversationId));
          return;
        }
        createdId = result.conversationId;
        setConversationId(result.conversationId);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[SmartCodeEditorModal] launch failed", err);
      });

    return () => {
      cancelled = true;
      if (createdId) {
        dispatch(destroyInstanceIfAllowed(createdId));
        setConversationId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId]);

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
            workspaceName={workspaceName}
            workspaceFolders={workspaceFolders}
            gitBranch={gitBranch}
            gitStatus={gitStatus}
            agentSkills={agentSkills}
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
