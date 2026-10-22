"use client";

// Chat's rename body (the canonical TextInputDialog writing through renameConversationTitle), answering the
// request chat's opener filed through the app's port.
import {
  ConversationRenameDialog,
  type ConversationRenameDialogProps,
} from "@ai-matrx/chat/agents/components/conversation-actions/rename/ConversationRenameDialogHostImpl";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";

export default function ConversationRenameDialogRender({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<NonNullable<ConversationRenameDialogProps["request"]>, boolean>(data, close);
  return <ConversationRenameDialog request={request} open={request !== null} onSettle={settle} />;
}
