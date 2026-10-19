"use client";

import { DebugIndicator } from "@/components/debug/DebugIndicator";
import type { DebugData } from "@/components/debug/SystemPromptDebugModal";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { DebugModeGate } from "@/components/debug/DebugModeGate";

/** Shown only in admin debug mode (closes itself when debug mode is off). */
export default function OverlayRender({ data, close }: OverlayRenderProps) {
  return (
    <DebugModeGate close={close}>
      <Body data={data} close={close} />
    </DebugModeGate>
  );
}

function Body({ data, close }: Pick<OverlayRenderProps, "data" | "close">) {
  const debugData = (data as { debugData?: DebugData } | null | undefined)?.debugData ?? null;
  return <DebugIndicator debugData={debugData} onClose={() => close()} />;
}
