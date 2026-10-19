"use client";

import { isWalkUnitKind } from "@/features/review-walk/address";
import ReviewWalkWindow from "@/features/review-walk/components/ReviewWalkWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        // Every kind the walk supports (wf_node_outcome included) — a
        // deep-linked or restored step walk must not render nothing.
        const unitKind = isWalkUnitKind(data?.unitKind) ? data.unitKind : null;
        if (typeof data?.unitId !== "string" || unitKind === null) {
          return <OverlayNeedsData overlayId="reviewWalkWindow" onClose={close} />;
        }
        return (
          <ReviewWalkWindow
            key={instanceId}
            instanceId={instanceId}
            stackIndex={
              typeof data.stackIndex === "number" ? data.stackIndex : 0
            }
            onClose={() =>
              close()
            }
            unitKind={unitKind}
            unitId={data.unitId}
            agentId={typeof data.agentId === "string" ? data.agentId : null}
            agentName={
              typeof data.agentName === "string" ? data.agentName : null
            }
            roleLabel={
              typeof data.roleLabel === "string" ? data.roleLabel : null
            }
            detailLabel={
              typeof data.detailLabel === "string" ? data.detailLabel : null
            }
          />
        );
}
