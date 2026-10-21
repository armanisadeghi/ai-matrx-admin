"use client";

// features/rich-document/hosts/DocumentDialogsImpl.tsx
//
// The dialogs behind useDocumentDialogsHost, compiled as ONE piece behind the
// host's single dynamic edge: the convert-source dialog and the
// save-as-flashcard question prompt (the chat package's SaveAsFlashcardDialog). (Saving a table is the `saveToTable`
// overlay — the one "Save to a table" every surface opens.)

import * as React from "react";
import {
  ConvertContentDialog,
  type ConvertOrigin,
} from "@/features/education/convert/ConvertContentDialog";
import { SaveAsFlashcardDialog } from "@ai-matrx/chat/window-panels/windows/study/SaveAsFlashcardDialog";
import { DocumentAgentReview } from "./DocumentAgentReview";
import { ChatMessageDialogs } from "./ChatMessageDialogs";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";

export interface DocumentDialogsImplProps {
  convert: {
    origin: ConvertOrigin;
    text: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  } | null;
  cardAnswer: string | null;
  onCardClose: () => void;
  agentReview: {
    actionId: "cleanup" | "help" | "customAgent";
    ctx: RichDocumentActionContext;
  } | null;
  onAgentReviewClose: () => void;
  chatDialog: {
    dialog: "delete" | "history";
    conversationId: string;
    messageId: string;
    surfaceKey: string | null;
  } | null;
  onChatDialogClose: () => void;
}

export default function DocumentDialogsImpl(
  props: DocumentDialogsImplProps,
): React.ReactElement {
  const {
    convert,
    cardAnswer,
    onCardClose,
    agentReview,
    onAgentReviewClose,
    chatDialog,
    onChatDialogClose,
  } = props;
  return (
    <>
      {convert ? (
        <ConvertContentDialog
          open={convert.open}
          onOpenChange={convert.onOpenChange}
          origin={convert.origin}
          text={convert.text}
        />
      ) : null}
      {chatDialog ? (
        <ChatMessageDialogs {...chatDialog} onClose={onChatDialogClose} />
      ) : null}
      {agentReview ? (
        <DocumentAgentReview
          actionId={agentReview.actionId}
          ctx={agentReview.ctx}
          onClose={onAgentReviewClose}
        />
      ) : null}
      {cardAnswer !== null ? (
        // The chat package's flashcard prompt (window-panels/windows/study) — the one Matrx 2 opens.
        <SaveAsFlashcardDialog answer={cardAnswer} onClose={onCardClose} />
      ) : null}
    </>
  );
}
