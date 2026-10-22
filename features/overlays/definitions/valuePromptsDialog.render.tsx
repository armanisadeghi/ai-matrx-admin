"use client";

/**
 * The `valuePromptsDialog` overlay: design-system's ValuePromptsDialog (its boxes are the app's ProInput /
 * ProTextarea through the writing-box seam, registered in components/agent-copy/AlchemyHost). Chat's `promptForValues`
 * opens it through its windows port and awaits summon's requestOverlay.
 */
import { ValuePromptsDialog } from "@ai-matrx/design-system";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";
import type { ValuePromptsAnswers, ValuePromptsRequest } from "@ai-matrx/chat/ui/valuePromptsOpener";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<ValuePromptsRequest, ValuePromptsAnswers>(data, close);
  return <ValuePromptsDialog request={request} open={request !== null} onSettle={settle} />;
}
