"use client";

import type { CodeEditorAgentConfig, CodeFile as AgentCodeEditorCodeFile } from "@/features/code-editor/agent-code-editor/types";
import { SmartCodeEditorWindow } from "@/features/window-panels/windows/smart-code-editor/SmartCodeEditorWindow";
import { isMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <SmartCodeEditorWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : ""
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            agents={
              (Array.isArray(data?.agents) ||
              (typeof data?.agents === "object" && data?.agents !== null)
                ? data.agents
                : []) as CodeEditorAgentConfig[]
            }
            defaultPickerMandateKey={
              // PROVEN DECLARED, not cast: the overlay `data` bag is untyped, and
              // the code editor's picker only offers code-declared editing jobs.
              // A stale key from a persisted window therefore falls back to
              // `agents[0]` instead of selecting a job that no longer exists.
              isMandateKey(data?.defaultPickerMandateKey)
                ? data.defaultPickerMandateKey
                : undefined
            }
            initialCode={
              typeof data?.initialCode === "string"
                ? data.initialCode
                : undefined
            }
            language={
              typeof data?.language === "string" ? data.language : undefined
            }
            files={
              (Array.isArray(data?.files) ||
              (typeof data?.files === "object" && data?.files !== null)
                ? data.files
                : undefined) as AgentCodeEditorCodeFile[] | undefined
            }
            initialActiveFilePath={
              typeof data?.initialActiveFilePath === "string"
                ? data.initialActiveFilePath
                : undefined
            }
            filePath={
              typeof data?.filePath === "string" ? data.filePath : undefined
            }
            selection={
              typeof data?.selection === "string" ? data.selection : undefined
            }
            diagnostics={
              typeof data?.diagnostics === "string"
                ? data.diagnostics
                : undefined
            }
            workspaceName={
              typeof data?.workspaceName === "string"
                ? data.workspaceName
                : undefined
            }
            workspaceFolders={
              typeof data?.workspaceFolders === "string"
                ? data.workspaceFolders
                : undefined
            }
            gitBranch={
              typeof data?.gitBranch === "string" ? data.gitBranch : undefined
            }
            gitStatus={
              typeof data?.gitStatus === "string" ? data.gitStatus : undefined
            }
            agentSkills={
              typeof data?.agentSkills === "string"
                ? data.agentSkills
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : null}
          />
        );
}
