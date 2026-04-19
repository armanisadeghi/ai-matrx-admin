"use client";

/**
 * UserActionBar — inline action buttons attached under a user message.
 *
 * Differs from the assistant bar in two ways:
 *   1. No like / dislike — rating is for model output, not your own input.
 *   2. Adds "Edit & resubmit" — the common user action of re-asking a
 *      question with different wording. On save, the conversation forks at
 *      the prior turn, the user's message content is updated on the fork
 *      head, and the user can hit Send from the input bar to launch the
 *      new AI turn on the branch.
 *
 * Plain "Edit" is also present — use it when you want to correct the
 * recorded user message WITHOUT re-running the AI (for transcript
 * curation, typo fixes, etc.).
 */

import React, { useRef, useState, lazy, Suspense } from "react";
import { Copy, Check, Edit, Send, MoreHorizontal } from "lucide-react";
import {
  TapTargetButtonForGroup,
  TapTargetButtonGroup,
} from "@/components/icons/TapTargetButton";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { SpeakerButton } from "@/features/tts/components/SpeakerButton";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  openFullScreenEditor,
  closeOverlay,
} from "@/lib/redux/slices/overlaySlice";
import type { Json } from "@/types/database.types";
import type { RootState } from "@/lib/redux/store";
import { toast } from "sonner";

function serializeSaveError(error: unknown): {
  logPayload: Record<string, unknown>;
  message: string;
} {
  if (error instanceof Error) {
    return {
      logPayload: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      message: error.message || "Save failed",
    };
  }
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const message =
      (typeof e.message === "string" && e.message) ||
      (typeof e.details === "string" && e.details) ||
      (typeof e.hint === "string" && e.hint) ||
      "Save failed";
    return {
      logPayload: {
        code: e.code ?? null,
        message: e.message ?? null,
        details: e.details ?? null,
        hint: e.hint ?? null,
        status: e.status ?? null,
        name: e.name ?? null,
      },
      message,
    };
  }
  return { logPayload: { raw: String(error) }, message: "Save failed" };
}

const MessageOptionsMenu = lazy(() =>
  import("./MessageOptionsMenu").then((m) => ({
    default: m.MessageOptionsMenu,
  })),
);

export interface UserActionBarProps {
  /** Flat-text rendering of the user's message. */
  content: string;
  /** Server `cx_message.id` (or client temp id for an optimistic message). */
  messageId: string;
  /** Server `cx_conversation.id`. */
  conversationId: string;
  /** Optional metadata (passed to the overflow menu's save/export items). */
  metadata?: Record<string, unknown> | null;
}

export function UserActionBar({
  content,
  messageId,
  conversationId,
  metadata = null,
}: UserActionBarProps) {
  const dispatch = useAppDispatch();

  const [isCopied, setIsCopied] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await copyToClipboard(content, {
      onSuccess: () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      onError: (err) => console.error("Failed to copy:", err),
    });
  };

  const handleEdit = () => {
    // Plain edit — overwrite the stored content, no fork, no resubmit.
    const instanceId = `user-edit-${messageId}`;
    dispatch(
      openFullScreenEditor({
        content,
        instanceId,
        messageId,
        analysisData: metadata ?? undefined,
        onSave: async (newContent: string) => {
          try {
            const { editMessage } =
              await import("@/features/agents/redux/execution-system/message-crud");
            const nextContent = [
              { type: "text", text: newContent },
            ] as unknown as Json;
            await dispatch(
              editMessage({
                conversationId,
                messageId,
                newContent: nextContent,
              }),
            ).unwrap();
            toast.success("Message saved");
          } catch (err) {
            const { logPayload, message } = serializeSaveError(err);
            // eslint-disable-next-line no-console
            console.error(
              "[UserActionBar] edit save failed",
              JSON.stringify(logPayload, null, 2),
            );
            toast.error(message);
          }
          dispatch(closeOverlay({ overlayId: "fullScreenEditor", instanceId }));
        },
      }),
    );
  };

  const handleEditAndResubmit = () => {
    // Fork + edit + surface the fork head. The user can hit Send from the
    // input bar to launch the new AI turn on the branch.
    const instanceId = `user-edit-resubmit-${messageId}`;
    dispatch(
      openFullScreenEditor({
        content,
        instanceId,
        messageId,
        analysisData: metadata ?? undefined,
        onSave: async (newContent: string) => {
          try {
            const { forkConversation, editMessage } =
              await import("@/features/agents/redux/execution-system/message-crud");
            // Read position right before firing. Fork at (position - 1) so
            // this message becomes the next turn on the branch, replacing
            // whatever originally came after.
            const positionThunk = (_: unknown, getState: () => RootState) => {
              const entry =
                getState().messages.byConversationId[conversationId];
              const msg = entry?.byId?.[messageId];
              const position = msg?.position ?? 0;
              const forkPosition = Math.max(0, position - 1);
              return dispatch(
                forkConversation({
                  conversationId,
                  atPosition: forkPosition,
                }),
              ).unwrap();
            };
            await dispatch(positionThunk as never);

            await dispatch(
              editMessage({
                conversationId,
                messageId,
                newContent: [
                  { type: "text", text: newContent },
                ] as unknown as Json,
              }),
            ).unwrap();
            toast.success("Forked — edit saved on the new branch");
          } catch (err) {
            const { logPayload, message } = serializeSaveError(err);
            // eslint-disable-next-line no-console
            console.error(
              "[UserActionBar] edit & resubmit failed",
              JSON.stringify(logPayload, null, 2),
            );
            toast.error(message);
          }
          dispatch(closeOverlay({ overlayId: "fullScreenEditor", instanceId }));
        },
      }),
    );
  };

  return (
    <>
      <TapTargetButtonGroup>
        <TapTargetButtonForGroup
          onClick={handleCopy}
          ariaLabel="Copy message"
          icon={
            isCopied ? (
              <Check className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )
          }
        />

        <SpeakerButton text={content} variant="group" />

        <TapTargetButtonForGroup
          onClick={handleEdit}
          ariaLabel="Edit message"
          icon={<Edit className="w-4 h-4 text-muted-foreground" />}
        />

        <TapTargetButtonForGroup
          onClick={handleEditAndResubmit}
          ariaLabel="Edit and resubmit"
          icon={<Send className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />}
        />

        <div ref={moreOptionsButtonRef}>
          <TapTargetButtonForGroup
            onClick={() => setShowOptionsMenu(true)}
            ariaLabel="More options"
            icon={<MoreHorizontal className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      </TapTargetButtonGroup>

      {showOptionsMenu && (
        <Suspense fallback={null}>
          <MessageOptionsMenu
            role="user"
            isOpen={showOptionsMenu}
            onClose={() => setShowOptionsMenu(false)}
            content={content}
            messageId={messageId}
            conversationId={conversationId}
            metadata={metadata}
            anchorElement={moreOptionsButtonRef.current}
          />
        </Suspense>
      )}
    </>
  );
}
