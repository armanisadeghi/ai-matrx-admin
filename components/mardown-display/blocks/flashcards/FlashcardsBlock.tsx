"use client";
import React, { useMemo, useState } from "react";
import { BookOpen, Grid2x2, LayoutList } from "lucide-react";
import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";
import FlashcardItem from "./FlashcardItem";
import { parseFlashcards } from "./flashcard-parser";
import { Button } from "@/components/ui/button";
import { cn } from "@/styles/themes/utils";

interface FlashcardsBlockProps {
    content: string;
}

type LayoutMode = "grid" | "list";

interface LayoutToggleProps {
    layoutMode: LayoutMode;
    onLayoutChange: (mode: LayoutMode) => void;
}

const LayoutToggle: React.FC<LayoutToggleProps> = ({ layoutMode, onLayoutChange }) => {
    return (
        <div className="flex gap-1">
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-7 w-7 p-0",
                    layoutMode === "grid" && "bg-accent"
                )}
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
                className={cn(
                    "h-7 w-7 p-0",
                    layoutMode === "list" && "bg-accent"
                )}
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

const FlashcardsBlock: React.FC<FlashcardsBlockProps> = ({ content }) => {
    const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");

    // Parse flashcards from content
    const { flashcards, isComplete, partialCard } = useMemo(() => {
        return parseFlashcards(content);
    }, [content]);

    // Calculate total count including partial card if streaming
    const totalCount = flashcards.length + (partialCard && !isComplete ? 1 : 0);
    const completeCount = flashcards.length;

    return (
        <ChatCollapsibleWrapper
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            title={
                <div className="flex items-center justify-between w-full pr-8">
                    <span>
                        Flashcards
                        {!isComplete && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                ({completeCount} ready{partialCard ? ', 1 loading...' : ''})
                            </span>
                        )}
                        {isComplete && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                ({completeCount} {completeCount === 1 ? 'card' : 'cards'})
                            </span>
                        )}
                    </span>
                    <LayoutToggle layoutMode={layoutMode} onLayoutChange={setLayoutMode} />
                </div>
            }
            initialOpen={true}
        >
            <div className={cn(
                "gap-4 p-4",
                layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col"
            )}>
                {flashcards.map((card, index) => (
                    <FlashcardItem
                        key={`flashcard-${index}`}
                        front={card.front}
                        back={card.back}
                        index={index}
                        layoutMode={layoutMode}
                    />
                ))}
                
                {/* Show placeholder for partial card if streaming */}
                {!isComplete && partialCard && (
                    <div 
                        className={cn(
                            "relative w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center animate-pulse",
                            layoutMode === "list" && "max-w-full"
                        )}
                        aria-label="Loading flashcard"
                    >
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <BookOpen className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                            <div className="text-sm">Loading flashcard...</div>
                            {partialCard.front && (
                                <div className="text-xs mt-1 px-4">
                                    {partialCard.front.substring(0, 30)}...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {flashcards.length === 0 && !partialCard && (
                <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                    No flashcards available yet...
                </div>
            )}

            {/* Bottom layout toggle */}
            {flashcards.length > 0 && (
                <div className="flex justify-center items-center gap-2 pb-4 pt-2">
                    <span className="text-xs text-muted-foreground">Layout:</span>
                    <LayoutToggle layoutMode={layoutMode} onLayoutChange={setLayoutMode} />
                </div>
            )}
        </ChatCollapsibleWrapper>
    );
};

export default FlashcardsBlock;

