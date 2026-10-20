"use client";
import { FullScreenPortal } from "../FullScreenPortal";
import React, { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import ChatCollapsibleWrapper from "@ai-matrx/rich-content/display/blocks/ChatCollapsibleWrapper";
import FlashcardMobileView from "./FlashcardMobileView";
import {
  toFlashcardMobileCards,
  useFlashcardDeckView,
} from "./flashcard-mobile-bridge";
import {
  FlashcardsSetBody,
  FlashcardsSetControls,
  useFlashcardsSet,
} from "./flashcards-set-parts";
import { InlineArtifactDebugStrip } from "@/features/canvas/components/CanvasArtifactDebugPanel";
import type { FlashcardsBlockData } from "@ai-matrx/agents/generated/stream-events";
import { flashcardsPrinterLazy as flashcardsPrinter } from "@ai-matrx/print/flashcards-lazy";
import { PrintOptionsDialog } from "@ai-matrx/print/react";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { useOpenFlashcardsBlockWindow } from "@/features/overlays/definitions/flashcardsBlockWindow.overlay";
import { Button } from "@ai-matrx/design-system/controls";
import {
  BlockControlsButton,
  type BlockControlsHandle,
} from "@ai-matrx/rich-content/display/block-controls/BlockControls";

interface FlashcardsBlockProps {
  content?: string;
  serverData?: FlashcardsBlockData;
  /** Optional JSON merged into each card's additionalDetails (pre-parsed paths only). */
  additionalDetails?: Record<string, unknown>;
  taskId?: string;
  className?: string;
  /** Persisted canvas_items UUID when materialized. */
  artifactId?: string;
  messageId?: string;
  conversationId?: string;
  blockIndex?: number;
  /**
   * True only while the producer is still writing this set. Anything else —
   * ended (for any reason, errors included), saved, reopened — is settled:
   * every card renders and nothing shows "Loading" again.
   */
  isStreamActive?: boolean;
  /** Block Controls for the set (null/absent = this surface cannot save: no controls). */
  controls?: BlockControlsHandle | null;
}

const FlashcardsBlock: React.FC<FlashcardsBlockProps> = ({
  content,
  serverData,
  additionalDetails: blockAdditionalDetails,
  taskId: _taskId,
  className,
  artifactId,
  messageId,
  conversationId,
  blockIndex,
  isStreamActive,
  controls = null,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchParams = useSearchParams();
  const isAdmin = useAppSelector(selectIsAdmin);
  const openFlashcardsBlockWindow = useOpenFlashcardsBlockWindow();

  const set = useFlashcardsSet({
    content,
    serverData,
    additionalDetails: blockAdditionalDetails,
    artifactId,
    messageId,
    conversationId,
    blockIndex,
    settled: isStreamActive !== true,
  });

  const {
    isMobileView,
    enterMobileView,
    exitMobileView,
    mobileStartIndex,
  } = useFlashcardDeckView();

  const handleOpenInWindow = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    openFlashcardsBlockWindow({
      content: content ?? set.rawPayload ?? null,
      serverData:
        serverData ??
        (set.flashcards.length > 0
          ? {
              cards: set.flashcards.map((card) => ({
                front: card.front ?? "",
                back: card.back ?? null,
              })),
              isComplete: set.isComplete,
            }
          : null),
      additionalDetails: blockAdditionalDetails ?? null,
      taskId: _taskId ?? null,
      artifactId: artifactId ?? null,
      messageId: messageId ?? null,
      conversationId: conversationId ?? null,
      blockIndex: blockIndex ?? null,
      title: `Flashcards (${set.completeCount})`,
    });
  };

  useEffect(() => {
    if (
      searchParams.get("mode") === "flash" &&
      set.flashcards.length > 0 &&
      !isMobileView
    ) {
      enterMobileView(0);
    }
  }, [searchParams, set.flashcards.length, isMobileView, enterMobileView]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  const enterFlashMode = (index = 0) => {
    enterMobileView(index);
  };

  const mobileFlashcards = toFlashcardMobileCards(set.flashcards);

  if (isMobileView && set.flashcards.length > 0) {
    return (
      <FlashcardMobileView
        cards={mobileFlashcards}
        initialIndex={mobileStartIndex}
        onClose={exitMobileView}
      />
    );
  }

  if (isFullscreen) {
    return (
      <>
        <FullScreenPortal active>
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {set.isComplete && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({set.completeCount}{" "}
                      {set.completeCount === 1 ? "card" : "cards"})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FlashcardsSetControls
                  layoutMode={set.layoutMode}
                  onLayoutChange={set.setLayoutMode}
                  onMobileView={() => {
                    setIsFullscreen(false);
                    enterFlashMode();
                  }}
                  onPrint={set.triggerPrint}
                  deckHref={set.deckHref}
            onSaveDeck={set.handleSaveDeck}
            savingDeck={set.savingDeck}
                  onOpenCanvas={() => {
                    setIsFullscreen(false);
                    set.handleOpenInCanvas();
                  }}
                  onOpenInWindow={handleOpenInWindow}
                  isAdmin={isAdmin}
                  showDevWindow
                  size="sm"
                />
                <Button variant="quiet" icon={<X />} onClick={() => setIsFullscreen(false)} title="Exit fullscreen (ESC)" aria-label="Exit fullscreen (ESC)" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FlashcardsSetBody
                flashcards={set.flashcards}
                isComplete={set.isComplete}
                layoutMode={set.layoutMode}
                hasStreamingCard={set.hasStreamingCard}
              />
              {set.flashcards.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {/* read-gate-exempt: cards are parsed from this message's own streamed markdown; there is no read that can fail */}
                  No flashcards available yet...
                </div>
              )}
            </div>

            {set.flashcards.length > 0 && (
              <div className="border-t border-border bg-background/50 p-3">
                <FlashcardsSetControls
                  layoutMode={set.layoutMode}
                  onLayoutChange={set.setLayoutMode}
                  onMobileView={() => {
                    setIsFullscreen(false);
                    enterFlashMode();
                  }}
                  onPrint={set.triggerPrint}
                  deckHref={set.deckHref}
            onSaveDeck={set.handleSaveDeck}
            savingDeck={set.savingDeck}
                  onOpenCanvas={() => {
                    setIsFullscreen(false);
                    set.handleOpenInCanvas();
                  }}
                  variant="bar"
                  size="xs"
                />
              </div>
            )}
          </div>
        </div>
        </FullScreenPortal>

        <PrintOptionsDialog
          printer={flashcardsPrinter}
          data={set.printData}
          open={set.printOpen}
          onOpenChange={set.setPrintOpen}
        />
      </>
    );
  }

  return (
    <>
      <InlineArtifactDebugStrip
        label="flashcards block"
        artifactId={artifactId ?? set.lastResult?.artifactId}
        messageId={messageId}
        conversationId={conversationId}
        lastSteps={set.lastResult?.steps}
        lastErrors={set.lastResult?.errors}
        busy={set.openingCanvas}
      />
      <ChatCollapsibleWrapper
        className={className}
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        title={<span>{set.completeCount} {set.completeCount === 1 ? "flashcard" : "flashcards"}</span>}
        controls={
          <>
            <BlockControlsButton controls={controls} title="Flashcard controls" />
            <FlashcardsSetControls
              layoutMode={set.layoutMode}
              onLayoutChange={set.setLayoutMode}
              onMobileView={enterFlashMode}
              onPrint={set.triggerPrint}
              deckHref={set.deckHref}
              onSaveDeck={set.handleSaveDeck}
              savingDeck={set.savingDeck}
              onOpenCanvas={set.handleOpenInCanvas}
              openingCanvas={set.openingCanvas}
              onFullscreen={() => setIsFullscreen(true)}
              onOpenInWindow={handleOpenInWindow}
              isAdmin={isAdmin}
              showFullscreen
              showDevWindow
            />
          </>
        }
        initialOpen={true}
      >
        <FlashcardsSetBody
          flashcards={set.flashcards}
          isComplete={set.isComplete}
          layoutMode={set.layoutMode}
          hasStreamingCard={set.hasStreamingCard}
          controls={controls}
        />

        {set.flashcards.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {/* read-gate-exempt: cards are parsed from this message's own streamed markdown; there is no read that can fail */}
            No flashcards available yet...
          </div>
        )}

      </ChatCollapsibleWrapper>

      <PrintOptionsDialog
        printer={flashcardsPrinter}
        data={set.printData}
        open={set.printOpen}
        onOpenChange={set.setPrintOpen}
      />
    </>
  );
};

export default FlashcardsBlock;
