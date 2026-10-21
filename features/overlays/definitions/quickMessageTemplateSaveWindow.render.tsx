"use client";

// "Save as Message Template" is the chat package's window (one body on the web and Matrx 2).
import QuickMessageTemplateSaveWindow from "@ai-matrx/chat/window-panels/windows/message-templates/QuickMessageTemplateSaveWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  return (
    <QuickMessageTemplateSaveWindow
      isOpen
      onClose={() => close()}
      initialContent={typeof data?.initialContent === "string" ? data.initialContent : undefined}
      defaultName={typeof data?.defaultName === "string" ? data.defaultName : undefined}
      defaultRole={typeof data?.defaultRole === "string" ? data.defaultRole : undefined}
    />
  );
}
