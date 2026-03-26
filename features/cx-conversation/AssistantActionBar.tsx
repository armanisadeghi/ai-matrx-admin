'use client';

import React, { useState, useRef, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import {
  TapTargetButtonForGroup,
  TapTargetButtonGroup,
} from '@/app/(ssr)/_components/core/TapTargetButton';
import { SpeakerButton } from '@/features/tts/components/SpeakerButton';
import { copyToClipboard } from '@/components/matrx/buttons/markdown-copy-utils';

const ConversationMessageOptionsMenu = lazy(
  () => import('@/features/cx-conversation/MessageOptionsMenu'),
);

export interface AssistantActionBarProps {
  content: string;
  messageId: string;
  sessionId?: string;
  hasUnsavedChanges?: boolean;
  hasHistory?: boolean;
  isSaving?: boolean;
  rawContent?: unknown[];
  onEdit: () => void;
  onQuickSave?: () => void;
  onShowHistory?: () => void;
  onShowHtmlPreview?: () => void;
  onFullPrint?: () => void;
}

export function AssistantActionBar({
  content,
  messageId,
  sessionId,
  hasUnsavedChanges = false,
  hasHistory = false,
  isSaving = false,
  rawContent,
  onEdit,
  onQuickSave,
  onShowHistory,
  onShowHtmlPreview,
  onFullPrint,
}: AssistantActionBarProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await copyToClipboard(content, {
        onSuccess: () => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        },
        onError: (err) => console.error('Failed to copy:', err),
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      <TapTargetButtonGroup>
        {/* Like */}
        <TapTargetButtonForGroup
          onClick={() => {
            setIsLiked(!isLiked);
            if (isDisliked) setIsDisliked(false);
          }}
          ariaLabel="Like message"
          icon={
            <ThumbsUp
              className={`w-4 h-4 ${isLiked ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`}
            />
          }
        />

        {/* Dislike */}
        <TapTargetButtonForGroup
          onClick={() => {
            setIsDisliked(!isDisliked);
            if (isLiked) setIsLiked(false);
          }}
          ariaLabel="Dislike message"
          icon={
            <ThumbsDown
              className={`w-4 h-4 ${isDisliked ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}
            />
          }
        />

        {/* Copy */}
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

        {/* Speaker — self-contained Cartesia TTS */}
        <SpeakerButton text={content} variant="group" />

        {/* Save (conditional) */}
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

        {/* History (conditional) */}
        {hasHistory && (
          <TapTargetButtonForGroup
            onClick={onShowHistory}
            ariaLabel="View edit history"
            icon={<History className="w-4 h-4 text-muted-foreground" />}
          />
        )}

        {/* Edit */}
        <TapTargetButtonForGroup
          onClick={onEdit}
          ariaLabel="Edit message"
          icon={<Edit className="w-4 h-4 text-muted-foreground" />}
        />

        {/* More options */}
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
            content={content}
            messageId={messageId}
            sessionId={sessionId}
            onClose={() => setShowOptionsMenu(false)}
            onShowHtmlPreview={onShowHtmlPreview ? () => { setShowOptionsMenu(false); onShowHtmlPreview(); } : undefined}
            onEditContent={() => { setShowOptionsMenu(false); onEdit(); }}
            onFullPrint={onFullPrint ? () => { setShowOptionsMenu(false); onFullPrint(); } : undefined}
            onShowHistory={onShowHistory ? () => { setShowOptionsMenu(false); onShowHistory(); } : undefined}
            rawContent={rawContent}
            anchorElement={moreOptionsButtonRef.current}
          />
        </Suspense>
      )}
    </>
  );
}
