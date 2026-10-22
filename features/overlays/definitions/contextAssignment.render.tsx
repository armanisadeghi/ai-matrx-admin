"use client";

import { ContextAssignmentWindow } from "@/features/scopes/components/context-assignment/ContextAssignmentWindow";
import type { EntityType } from "@/features/scopes/types";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const rawSubject =
          data?.subject && typeof data.subject === "object"
            ? (data.subject as Record<string, unknown>)
            : null;
        if (!rawSubject) return <OverlayNeedsData overlayId="contextAssignment" onClose={close} />;
        const subject = {
          entityType: rawSubject.entityType as EntityType,
          entityId:
            typeof rawSubject.entityId === "string" ? rawSubject.entityId : "",
          title: typeof rawSubject.title === "string" ? rawSubject.title : "",
        };
        return (
          <ContextAssignmentWindow
            open
            onClose={() =>
              close()
            }
            subject={subject}
            mode="assignment"
            closeOnSaved
          />
        );
}
