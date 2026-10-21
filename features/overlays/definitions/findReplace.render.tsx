"use client";

// Find & Replace's body is the chat package's (one body on the web and Matrx 2). The live target
// and the replace handler never travel through Redux: the opener keeps them in a callback group
// and only its id rides the overlay data.
import FindReplaceWindow from "@ai-matrx/chat/window-panels/windows/find-replace/FindReplaceWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { getFindReplaceCallbackGroup } from "./callbacks/findReplace";

export default function OverlayRender({ data: overlayData, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  const group = getFindReplaceCallbackGroup(typeof data?.callbackGroupId === "string" ? data.callbackGroupId : null);
  return <FindReplaceWindow isOpen onClose={() => close()} getTargetElement={group?.getTargetElement ?? null} onReplace={group?.onReplace ?? null} />;
}
