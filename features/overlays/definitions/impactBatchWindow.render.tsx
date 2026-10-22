"use client";

import ImpactBatchWindow from "@/features/window-panels/windows/mandates/ImpactBatchWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const stringList = (value: unknown): string[] =>
          Array.isArray(value)
            ? (value as unknown[]).filter(
                (entry): entry is string => typeof entry === "string",
              )
            : [];
        return (
          <ImpactBatchWindow
            isOpen
            onClose={() =>
              close()
            }
            agentIds={stringList(data?.agentIds)}
            mode={data?.mode === "dry_run" ? "dry_run" : "post_batch"}
            delta={
              typeof data?.delta === "object" && data.delta !== null
                ? (data.delta as { model_id?: string | null; settings?: Record<string, unknown> | null })
                : null
            }
            batchLabel={
              typeof data?.batchLabel === "string" ? data.batchLabel : undefined
            }
            sourceSentence={
              typeof data?.sourceSentence === "string"
                ? data.sourceSentence
                : undefined
            }
            preselectedRungIds={stringList(data?.preselectedRungIds)}
            surfaceName={
              typeof data?.surfaceName === "string"
                ? data.surfaceName
                : undefined
            }
            posture={data?.posture === "mine" ? "mine" : "admin"}
            focusAgentId={
              typeof data?.focusAgentId === "string" ? data.focusAgentId : null
            }
          />
        );
}
