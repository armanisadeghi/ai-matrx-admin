"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  BookOpen,
  Grid2x2,
  LayoutList,
  Maximize2,
  X,
  ExternalLink,
  Printer,
  Smartphone,
} from "lucide-react";
import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";
import FlashcardItem from "./FlashcardItem";
import FlashcardMobileView from "./FlashcardMobileView";
import { parseFlashcards } from "./flashcard-parser";
import { Button } from "@/components/ui/button";
import { cn } from "@/styles/themes/utils";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import type { FlashcardsBlockData } from "@/types/python-generated/content-blocks";
import { flashcardsPrinter } from "./flashcards-printer";
import {
  PrintOptionsDialog,
  usePrintOptions,
} from "@/features/chat/components/print/PrintOptionsDialog";

interface FlashcardsBlockProps {
  content?: string;
  /** Server-parsed structured data (from content_block serverData). When present, skips client-side parsing. */
  serverData?: FlashcardsBlockData;
  taskId?: string;
  className?: string;
}

type LayoutMode = "grid" | "list";

interface LayoutToggleProps {
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
}

const LayoutToggle: React.FC<LayoutToggleProps> = ({
  layoutMode,
  onLayoutChange,
}) => {
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0", layoutMode === "grid" && "bg-accent")}
        onClick={(e) => {
          e.stopPropagation();
          onLayoutChange("grid");
        }}
        title="Grid view (2 columns)"
      >
        <Grid2x2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0", layoutMode === "list" && "bg-accent")}
        onClick={(e) => {
          e.stopPropagation();
          onLayoutChange("list");
        }}
        title="List view (1 per row)"
      >
        <LayoutList className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const FlashcardsBlock: React.FC<FlashcardsBlockProps> = ({
  content,
  serverData,
  taskId,
  className,
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileStartIndex, setMobileStartIndex] = useState(0);
  const { open: openCanvas } = useCanvas();

  // Use server-parsed data when available; fall back to client-side parsing.
  const { flashcards, isComplete } = useMemo(() => {
    if (serverData) {
      return {
        flashcards: serverData.cards ?? [],
        isComplete: serverData.isComplete ?? false,
      };
    }
    const parsed = parseFlashcards(content ?? "");
    return {
      flashcards: parsed.flashcards,
      isComplete: parsed.isComplete,
    };
  }, [content, serverData]);

  const completeCount = flashcards.length;

  // Print integration
  const printData = useMemo(
    () => (serverData ? serverData : { cards: flashcards }),
    [serverData, flashcards],
  );
  const {
    open: printOpen,
    setOpen: setPrintOpen,
    triggerPrint,
  } = usePrintOptions(flashcardsPrinter, printData);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when fullscreen
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  // A card with back=null is in the Loader Exception state (front received, back still streaming).
  const hasStreamingCard =
    !isComplete &&
    flashcards.some((c) => c.back === null || c.back === undefined);

  const renderFlashcards = () => (
    <div
      className={cn(
        "gap-2",
        isFullscreen ? "p-2 sm:p-4" : "p-0.5",
        layoutMode === "grid"
          ? "grid grid-cols-1 md:grid-cols-2"
          : "flex flex-col",
      )}
    >
      {flashcards.map((card, index) => (
        <FlashcardItem
          key={`flashcard-${index}`}
          front={card.front ?? ""}
          back={card.back ?? null}
          index={index}
          layoutMode={layoutMode}
        />
      ))}

      {/* Show incoming-card placeholder when not complete and no card with back=null yet */}
      {!isComplete && !hasStreamingCard && flashcards.length > 0 && (
        <div
          className={cn(
            "relative w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center animate-pulse",
            layoutMode === "list" && "max-w-full",
          )}
          aria-label="Loading next flashcard"
        >
          <div className="text-center text-gray-500 dark:text-gray-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <div className="text-sm">Loading flashcard...</div>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile one-at-a-time swipe view
  if (isMobileView && flashcards.length > 0) {
    return (
      <FlashcardMobileView
        cards={flashcards.map((c) => ({
          front: c.front ?? "",
          back: c.back ?? null,
        }))}
        initialIndex={mobileStartIndex}
        onClose={() => setIsMobileView(false)}
      />
    );
  }

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="h-full flex flex-col">
          {/* Fullscreen header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-background/50">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {isComplete && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({completeCount} {completeCount === 1 ? "card" : "cards"})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LayoutToggle
                layoutMode={layoutMode}
                onLayoutChange={setLayoutMode}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsFullscreen(false)}
                title="Exit fullscreen (ESC)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fullscreen content */}
          <div className="flex-1 overflow-y-auto">
            {renderFlashcards()}
            {flashcards.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                No flashcards available yet...
              </div>
            )}
          </div>

          {/* Fullscreen footer */}
          {flashcards.length > 0 && (
            <div className="flex justify-center items-center gap-2 p-3 border-t border-border bg-background/50">
              <span className="text-xs text-muted-foreground">Layout:</span>
              <LayoutToggle
                layoutMode={layoutMode}
                onLayoutChange={setLayoutMode}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal embedded view
  return (
    <>
      <ChatCollapsibleWrapper
        className={className}
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        title={<span>{completeCount}</span>}
        controls={
          <>
            <LayoutToggle
              layoutMode={layoutMode}
              onLayoutChange={setLayoutMode}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                triggerPrint();
              }}
              title="Print flashcards"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                openCanvas({
                  type: "flashcards",
                  data: content,
                  metadata: {
                    title: "Flashcards",
                    sourceTaskId: taskId,
                  },
                });
              }}
              title="Open in side panel"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setMobileStartIndex(0);
                setIsMobileView(true);
              }}
              title="Mobile swipe mode"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
              }}
              title="Fullscreen mode"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </>
        }
        initialOpen={true}
      >
        {renderFlashcards()}

        {flashcards.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 p-8">
            No flashcards available yet...
          </div>
        )}

        {/* Bottom controls */}
        {flashcards.length > 0 && (
          <div className="flex justify-center items-center gap-3 pb-4 pt-2">
            <div className="flex items-center gap-2">
              <LayoutToggle
                layoutMode={layoutMode}
                onLayoutChange={setLayoutMode}
              />
            </div>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={triggerPrint}
            >
              <Printer className="h-3 w-3" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white"
              onClick={() =>
                openCanvas({
                  type: "flashcards",
                  data: content,
                  metadata: {
                    title: "Flashcards",
                    sourceTaskId: taskId,
                  },
                })
              }
            >
              <ExternalLink className="h-3 w-3" />
              Side
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setMobileStartIndex(0);
                setIsMobileView(true);
              }}
            >
              <Smartphone className="h-3 w-3" />
              Mobile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-3 w-3" />
              Full
            </Button>
          </div>
        )}
      </ChatCollapsibleWrapper>

      <PrintOptionsDialog
        printer={flashcardsPrinter}
        data={printData}
        open={printOpen}
        onOpenChange={setPrintOpen}
      />
    </>
  );
};

export default FlashcardsBlock;
