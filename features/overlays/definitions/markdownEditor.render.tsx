"use client";

import FullscreenMarkdownEditor from "@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <FullscreenMarkdownEditor
            isOpen
            onClose={() =>
              close()
            }
            triggerClassName={
              typeof data?.triggerClassName === "string"
                ? data.triggerClassName
                : undefined
            }
            triggerLabel={
              typeof data?.triggerLabel === "string"
                ? data.triggerLabel
                : undefined
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
