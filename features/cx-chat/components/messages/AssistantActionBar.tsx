"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  lazy,
  Suspense,
} from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Edit,
  MoreHorizontal,
  Loader2,
  Save,
  History,
} from "lucide-react";
import {
  TapTargetButtonForGroup,
  TapTargetButtonGroup,
} from "@/components/icons/TapTargetButton";
import { SpeakerButton } from "@/features/tts/components/SpeakerButton";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { messageActionsActions } from "@/features/cx-conversation/redux/messageActionsSlice";
import {
  openFullScreenEditor,
  openContentHistory,
  closeOverlay,
} from "@/lib/redux/slices/overlaySlice";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";

const ConversationMessageOptionsMenu = lazy(
  () => import("./MessageOptionsMenu"),
);

export interface AssistantActionBarProps {
  content: string;
  messageId: string;
  sessionId?: string;
  conversationId?: string;
  hasUnsavedChanges?: boolean;
  hasHistory?: boolean;
  isSaving?: boolean;
  rawContent?: unknown[];
  onQuickSave?: () => void;
  onFullPrint?: () => void;
  isCapturing?: boolean;
}

export function AssistantActionBar({
  content,
  messageId,
  sessionId,
  conversationId,
  hasUnsavedChanges = false,
  hasHistory = false,
  isSaving = false,
  rawContent,
  onQuickSave,
  onFullPrint,
  isCapturing,
}: AssistantActionBarProps) {
  const dispatch = useAppDispatch();
  const reactId = useId();
  const instanceId = useRef(`msg-action-${reactId}`).current;

  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(
      messageActionsActions.registerInstance({
        id: instanceId,
        context: {
          content,
          messageId,
          sessionId: sessionId ?? "",
          conversationId: conversationId ?? null,
          rawContent: rawContent ?? null,
          metadata: null,
        },
      }),
    );
    return () => {
      dispatch(messageActionsActions.unregisterInstance(instanceId));
    };
  }, [instanceId, dispatch]);

  useEffect(() => {
    dispatch(
      messageActionsActions.updateInstanceContext({
        id: instanceId,
        updates: {
          content,
          messageId,
          sessionId: sessionId ?? "",
          conversationId: conversationId ?? null,
          rawContent: rawContent ?? null,
        },
      }),
    );
  }, [
    content,
    messageId,
    sessionId,
    conversationId,
    rawContent,
    instanceId,
    dispatch,
  ]);

  const handleCopy = async () => {
    try {
      await copyToClipboard(content, {
        onSuccess: () => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        },
        onError: (err) => console.error("Failed to copy:", err),
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleEdit = () => {
    dispatch(
      openFullScreenEditor({
        content,
        onSave: (newContent: string) => {
          if (sessionId && messageId) {
            dispatch(
              chatConversationsActions.updateMessage({
                sessionId,
                messageId,
                updates: { content: newContent },
              }),
            );
          }
          dispatch(closeOverlay({ overlayId: "fullScreenEditor" }));
        },
        messageId,
      }),
    );
  };

  const handleShowHistory = () => {
    if (!sessionId || !messageId) return;
    dispatch(openContentHistory({ sessionId, messageId }));
  };

  return (
    <>
      <TapTargetButtonGroup>
        <TapTargetButtonForGroup
          onClick={() => {
            setIsLiked(!isLiked);
            if (isDisliked) setIsDisliked(false);
          }}
          ariaLabel="Like message"
          icon={
            <ThumbsUp
              className={`w-4 h-4 ${isLiked ? "text-green-500 dark:text-green-400" : "text-muted-foreground"}`}
            />
          }
        />

        <TapTargetButtonForGroup
          onClick={() => {
            setIsDisliked(!isDisliked);
            if (isLiked) setIsLiked(false);
          }}
          ariaLabel="Dislike message"
          icon={
            <ThumbsDown
              className={`w-4 h-4 ${isDisliked ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}
            />
          }
        />

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

        {hasUnsavedChanges && (
          <TapTargetButtonForGroup
            onClick={onQuickSave}
            ariaLabel="Save changes"
            icon={
              isSaving ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-primary" />
              )
            }
          />
        )}

        {hasHistory && (
          <TapTargetButtonForGroup
            onClick={handleShowHistory}
            ariaLabel="View edit history"
            icon={<History className="w-4 h-4 text-muted-foreground" />}
          />
        )}

        <TapTargetButtonForGroup
          onClick={handleEdit}
          ariaLabel="Edit message"
          icon={<Edit className="w-4 h-4 text-muted-foreground" />}
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
          <ConversationMessageOptionsMenu
            isOpen={showOptionsMenu}
            instanceId={instanceId}
            onClose={() => setShowOptionsMenu(false)}
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
