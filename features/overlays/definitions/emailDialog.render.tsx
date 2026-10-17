"use client";

import EmailDialogBridge from "@/components/dialogs/EmailDialogBridge";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  return (true ? <EmailDialogBridge /> : null);
}
