"use client";

import type { CodeFile as MultiFileCoreCodeFile } from "@/features/code-editor/multi-file-core/types";
import { CodeEditorWindow } from "@/features/window-panels/windows/code/CodeEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <CodeEditorWindow
            key={instanceId}
            onClose={() =>
              close()
            }
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : ""
            }
            files={
              (Array.isArray(data?.files) ||
              (typeof data?.files === "object" && data?.files !== null)
                ? data.files
                : []) as MultiFileCoreCodeFile[]
            }
            fileIds={
              Array.isArray(data?.fileIds) &&
              data.fileIds.every((v) => typeof v === "string")
                ? (data.fileIds as string[])
                : undefined
            }
            activeFileId={
              typeof data?.activeFileId === "string"
                ? data.activeFileId
                : undefined
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
          />
        );
}
