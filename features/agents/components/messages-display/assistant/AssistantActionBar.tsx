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

import React, { useState, useRef, useCallback, lazy, Suspense } from "react";
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
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  openFullScreenEditor,
  closeOverlay,
} from "@/lib/redux/slices/overlaySlice";
import type { Json } from "@/types/database.types";
import { toast } from "sonner";
import { selectMessagePosition } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { DeleteMessageDialog } from "../message-options/DeleteMessageDialog";

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
  import("../message-options/MessageOptionsMenu").then((m) => ({
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
  /**
   * UI surface this action bar belongs to. Forwarded to the overflow
   * menu so fork / delete outcomes route correctly via the surfaces
   * registry. Optional — falls back to no navigation when omitted.
   */
  surfaceKey?: string;
}

export function AssistantActionBar({
  content,
  messageId,
  conversationId,
  metadata = null,
  onFullPrint,
  isCapturing,
  surfaceKey,
}: AssistantActionBarProps) {
  const dispatch = useAppDispatch();
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLDivElement>(null);

  const messagePosition = useAppSelector(
    selectMessagePosition(conversationId, messageId),
  );

  const handleConfirmDelete = useCallback(async () => {
    try {
      const { deleteMessage } =
        await import("@/features/agents/redux/execution-system/message-crud/delete-message.thunk");
      await dispatch(deleteMessage({ conversationId, messageId })).unwrap();
      toast.success("Message deleted");
    } catch (err) {
      const { logPayload, message } = serializeSaveError(err);
      // eslint-disable-next-line no-console
      console.error(
        "[AssistantActionBar] delete failed",
        JSON.stringify(logPayload, null, 2),
      );
      toast.error(message);
    }
  }, [dispatch, conversationId, messageId]);

  const handleConfirmDeleteFork = useCallback(async () => {
    try {
      const { forkConversation } =
        await import("@/features/agents/redux/execution-system/message-crud/fork-conversation.thunk");
      const { deleteMessage } =
        await import("@/features/agents/redux/execution-system/message-crud/delete-message.thunk");
      const forkPosition = Math.max(0, (messagePosition ?? 0) - 1);
      const forkResult = await dispatch(
        forkConversation({ conversationId, atPosition: forkPosition }),
      ).unwrap();
      const newConversationId = forkResult.conversationId;

      const findCopiedId = dispatch(((
        _: unknown,
        getState: () => import("@/lib/redux/store").RootState,
      ) => {
        const entry = getState().messages.byConversationId[newConversationId];
        if (!entry) return null;
        const match = Object.values(entry.byId).find(
          (m) => m.position === (messagePosition ?? 0),
        );
        return match?.id ?? null;
      }) as never) as unknown as string | null;

      if (typeof findCopiedId === "string") {
        await dispatch(
          deleteMessage({
            conversationId: newConversationId,
            messageId: findCopiedId,
          }),
        ).unwrap();
      }

      if (surfaceKey) {
        const { requestSurfaceNavigation } =
          await import("@/features/agents/redux/surfaces/request-surface-navigation.thunk");
        await dispatch(
          requestSurfaceNavigation({
            surfaceKey,
            conversationId: newConversationId,
            reason: "fork",
          }),
        );
      }
      toast.success("Forked without this message");
    } catch (err) {
      const { logPayload, message } = serializeSaveError(err);
      // eslint-disable-next-line no-console
      console.error(
        "[AssistantActionBar] fork-and-delete failed",
        JSON.stringify(logPayload, null, 2),
      );
      toast.error(message);
    }
  }, [dispatch, conversationId, messagePosition, surfaceKey]);

  const canFork = (messagePosition ?? 0) > 0;

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
              await import("@/features/agents/redux/execution-system/message-crud/edit-message.thunk");
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
              "[AssistantActionBar] edit save failed",
              JSON.stringify(logPayload, null, 2),
            );
            toast.error(message);
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
            surfaceKey={surfaceKey}
            onRequestDelete={() => setDeleteDialogOpen(true)}
          />
        </Suspense>
      )}

      <DeleteMessageDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        messageId={messageId}
        canFork={canFork}
        onConfirmDelete={handleConfirmDelete}
        onConfirmFork={handleConfirmDeleteFork}
      />
    </>
  );
}
