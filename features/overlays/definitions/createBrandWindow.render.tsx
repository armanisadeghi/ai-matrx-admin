"use client";

import CreateBrandWindow from "@/features/window-panels/windows/marketing/CreateBrandWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (
    <CreateBrandWindow
      key={instanceId}
      instanceId={instanceId}
      onClose={() => close()}
      callbackGroupId={typeof data?.callbackGroupId === "string" ? data.callbackGroupId : null}
    />
  );
}
