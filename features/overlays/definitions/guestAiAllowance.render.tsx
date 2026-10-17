"use client";

import { SignupConversionModal } from "@/components/guest/SignupConversionModal";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <SignupConversionModal
            isOpen
            onClose={() =>
              close()
            }
            message={typeof data?.message === "string" ? data.message : null}
          />
        );
}
