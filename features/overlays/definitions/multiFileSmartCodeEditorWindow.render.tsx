"use client";

import type { CodeFile as MultiFileCoreCodeFile } from "@/features/code-editor/multi-file-core/types";
import { MultiFileSmartCodeEditorWindow } from "@/features/window-panels/windows/multi-file-smart-code-editor/MultiFileSmartCodeEditorWindow";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <MultiFileSmartCodeEditorWindow
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
            mandateKey={
              typeof data?.mandateKey === "string"
                ? storedMandateKey(data.mandateKey)
                : ""
            }
            files={
              (Array.isArray(data?.files) ||
              (typeof data?.files === "object" && data?.files !== null)
                ? data.files
                : []) as MultiFileCoreCodeFile[]
            }
            initialActiveFile={
              typeof data?.initialActiveFile === "string"
                ? data.initialActiveFile
                : null
            }
            title={typeof data?.title === "string" ? data.title : null}
            defaultWordWrap={
              (["on", "off"] as ReadonlyArray<unknown>).includes(
                data?.defaultWordWrap,
              )
                ? (data?.defaultWordWrap as "on" | "off")
                : undefined
            }
            autoFormatOnOpen={
              typeof data?.autoFormatOnOpen === "boolean"
                ? data.autoFormatOnOpen
                : undefined
            }
            variables={
              data?.variables as Record<string, unknown> | null | undefined
            }
          />
        );
}
