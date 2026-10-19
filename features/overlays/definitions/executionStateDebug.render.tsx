"use client";

import { AgentExecutionDebugPanel } from "@/components/debug/AgentExecutionDebugPanel";
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
  const id = (data as { instanceId?: unknown } | null | undefined)?.instanceId;
  if (typeof id !== "string" || !id) return <DebugNeedsRecord close={close} what="execution instance" />;
  return <AgentExecutionDebugPanel instanceId={id} onClose={() => close()} />;
}
