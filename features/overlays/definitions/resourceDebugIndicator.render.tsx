"use client";

import { ResourceDebugIndicator } from "@/components/debug/ResourceDebugIndicator";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { DebugModeGate, DebugNeedsRecord } from "@/components/debug/DebugModeGate";

/** Shown only in admin debug mode (closes itself when debug mode is off). */
export default function OverlayRender({ data, close }: OverlayRenderProps) {
  return (
    <DebugModeGate close={close}>
      <Body data={data} close={close} />
    </DebugModeGate>
  );
}

function Body({ data, close }: Pick<OverlayRenderProps, "data" | "close">) {
  const conversationId = (data as { conversationId?: unknown } | null | undefined)?.conversationId;
  if (typeof conversationId !== "string" || !conversationId) return <DebugNeedsRecord close={close} what="conversation" />;
  return <ResourceDebugIndicator conversationId={conversationId} onClose={() => close()} />;
}
