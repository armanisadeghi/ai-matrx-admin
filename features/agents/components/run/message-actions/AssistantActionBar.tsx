"use client";

/**
 * AssistantActionBar — inline action buttons attached under an assistant
 * message. Contains the most common actions (like/dislike, copy, speaker,
 * edit, more) so the user doesn't have to open the overflow menu for them.
 *
 * "Edit" opens the full-screen editor; on save it round-trips through the
 * `editMessage` thunk which calls `cx_message_edit` and flips the
 * cache-bypass flag for the next AI turn. There is no resubmit button on
 * assistant messages — to re-run, the user types in the input bar. The
 * overflow menu (⋯) uses `role="assistant"` which does NOT include
 * Edit & Resubmit.
 */

import React, { useState, useRef, lazy, Suspense } from "react";
import { TapTargetButtonGroup } from "@/components/icons/TapTargetButton";
import {
  ThumbsUpTapButton,
  ThumbsDownTapButton,
  CopyTapButton,
  CheckTapButton,
  PencilTapButton,
  MoreHorizontalTapButton,
} from "@/components/icons/tap-buttons";
import { StreamingSpeakerButton } from "@/features/tts/components/StreamingSpeakerButton";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  openFullScreenEditor,
  closeOverlay,
} from "@/lib/redux/slices/overlaySlice";
import type { Json } from "@/types/database.types";

const MessageOptionsMenu = lazy(() =>
  import("./MessageOptionsMenu").then((m) => ({
    default: m.MessageOptionsMenu,
  })),
);

export interface AssistantActionBarProps {
  /** Flat-text rendering of the message. */
  content: string;
  /** Server `cx_message.id`. Required for the Edit action. */
  messageId: string;
  /** Server `cx_conversation.id`. Required for the Edit action. */
  conversationId: string;
  /** Optional JSON metadata (passed to the overflow menu's export / save items). */
  metadata?: Record<string, unknown> | null;
  /** Full-page print handler (DOM capture to PDF). */
  onFullPrint?: () => void;
  isCapturing?: boolean;
}

export function AssistantActionBar({
  content,
  messageId,
  conversationId,
  metadata = null,
  onFullPrint,
  isCapturing,
}: AssistantActionBarProps) {
  const dispatch = useAppDispatch();

  console.log("[AssistantActionBar] messageId:", messageId);
  console.log("[AssistantActionBar] conversationId:", conversationId);

  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
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
    dispatch(
      openFullScreenEditor({
        content,
        messageId,
        analysisData: metadata ?? undefined,
        instanceId: `assistant-edit-${messageId}`,
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
          } catch (err) {
            console.error("[AssistantActionBar] edit save failed", err);
          }
          dispatch(
            closeOverlay({
              overlayId: "fullScreenEditor",
              instanceId: `assistant-edit-${messageId}`,
            }),
          );
        },
      }),
    );
  };

  return (
    <>
      <TapTargetButtonGroup>
        <ThumbsUpTapButton
          variant="group"
          onClick={() => {
            setIsLiked(!isLiked);
            if (isDisliked) setIsDisliked(false);
          }}
          ariaLabel="Like message"
          className={
            isLiked
              ? "text-green-500 dark:text-green-400"
              : "text-muted-foreground"
          }
        />

        <ThumbsDownTapButton
          variant="group"
          onClick={() => {
            setIsDisliked(!isDisliked);
            if (isLiked) setIsLiked(false);
          }}
          ariaLabel="Dislike message"
          className={
            isDisliked
              ? "text-red-500 dark:text-red-400"
              : "text-muted-foreground"
          }
        />

        {isCopied ? (
          <CheckTapButton
            variant="group"
            onClick={handleCopy}
            ariaLabel="Copied"
            className="text-blue-500 dark:text-blue-400"
          />
        ) : (
          <CopyTapButton
            variant="group"
            onClick={handleCopy}
            ariaLabel="Copy message"
            className="text-muted-foreground"
          />
        )}

        <StreamingSpeakerButton text={content} variant="group" />

        <PencilTapButton
          variant="group"
          onClick={handleEdit}
          ariaLabel="Edit message"
          className="text-muted-foreground"
        />

        <div ref={moreOptionsButtonRef}>
          <MoreHorizontalTapButton
            variant="group"
            onClick={() => setShowOptionsMenu(true)}
            ariaLabel="More options"
            className="text-muted-foreground"
          />
        </div>
      </TapTargetButtonGroup>

      {showOptionsMenu && (
        <Suspense fallback={null}>
          <MessageOptionsMenu
            role="assistant"
            isOpen={showOptionsMenu}
            onClose={() => setShowOptionsMenu(false)}
            content={content}
            messageId={messageId}
            conversationId={conversationId}
            metadata={metadata}
            anchorElement={moreOptionsButtonRef.current}
            showFullPrint={!!onFullPrint}
            onFullPrint={onFullPrint}
            isCapturing={isCapturing}
          />
        </Suspense>
      )}
    </>
  );
}
