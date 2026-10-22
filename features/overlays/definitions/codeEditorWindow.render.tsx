"use client";

// The code editor window is the chat package's (the same body Matrx 2 hosts); this overlay only mounts it.
import CodeEditorWindow from "@ai-matrx/chat/window-panels/windows/code/CodeEditorWindow";
import type { ComponentProps } from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

type CodeFile = NonNullable<ComponentProps<typeof CodeEditorWindow>["files"]>[number];

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  return (
    <CodeEditorWindow
      key={instanceId}
      onClose={() => close()}
      windowInstanceId={typeof data?.windowInstanceId === "string" && data.windowInstanceId ? data.windowInstanceId : instanceId}
      files={(Array.isArray(data?.files) ? data.files : []) as CodeFile[]}
      fileIds={Array.isArray(data?.fileIds) && data.fileIds.every((v) => typeof v === "string") ? (data.fileIds as string[]) : undefined}
      activeFileId={typeof data?.activeFileId === "string" ? data.activeFileId : undefined}
      title={typeof data?.title === "string" ? data.title : null}
      defaultWordWrap={data?.defaultWordWrap === "on" || data?.defaultWordWrap === "off" ? data.defaultWordWrap : undefined}
      autoFormatOnOpen={typeof data?.autoFormatOnOpen === "boolean" ? data.autoFormatOnOpen : undefined}
    />
  );
}
