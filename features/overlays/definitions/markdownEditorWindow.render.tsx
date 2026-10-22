"use client";

import MarkdownEditorWindow from "@/features/window-panels/windows/MarkdownEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <MarkdownEditorWindow
            isOpen
            onClose={() =>
              close()
            }
            initialMarkdown={
              typeof data?.initialMarkdown === "string"
                ? data.initialMarkdown
                : undefined
            }
            showSampleSelector={
              typeof data?.showSampleSelector === "boolean"
                ? data.showSampleSelector
                : undefined
            }
            showConfigSelector={
              typeof data?.showConfigSelector === "boolean"
                ? data.showConfigSelector
                : undefined
            }
          />
        );
}
