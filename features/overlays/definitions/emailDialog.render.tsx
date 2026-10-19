"use client";

import EmailDialogBridge from "@/components/dialogs/EmailDialogBridge";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const content = typeof data?.content === "string" ? data.content : "";
  const metadata =
    data?.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : null;
  const title = typeof data?.title === "string" ? data.title : undefined;
  return <EmailDialogBridge data={{ content, metadata, title }} onClose={close} />;
}
