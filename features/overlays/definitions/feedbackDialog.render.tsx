"use client";

import type { FeedbackSubject } from "@/features/overlays/definitions/feedbackDialog.overlay";
import { FeedbackWindow } from "@/features/window-panels/windows/FeedbackWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <FeedbackWindow
            title={typeof data?.title === "string" ? data.title : undefined}
            subject={
              data?.subject && typeof data.subject === "object"
                ? (data.subject as FeedbackSubject)
                : undefined
            }
          />
        );
}
