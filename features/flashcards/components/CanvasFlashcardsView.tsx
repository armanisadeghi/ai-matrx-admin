'use client';

import React, { useMemo } from 'react';
import { parseFlashcards } from '@/components/mardown-display/blocks/flashcards/flashcard-parser';
import FlashcardItem from '@/components/mardown-display/blocks/flashcards/FlashcardItem';
import { useFlashcardStudy } from '../hooks/useFlashcardStudy';
import type { FlashcardCard, ReviewResult } from '../types';
import type { FlashcardsBlockData } from '@/types/python-generated/content-blocks';
import { cn } from '@/styles/themes/utils';
import { BookOpen, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasFlashcardsViewProps {
    /** Raw string content (from canvas data) */
    content?: string;
    /** Pre-parsed server data */
    serverData?: FlashcardsBlockData;
    /** cx_conversation id */
    conversationId?: string;
    /** cx_message id */
    messageId?: string;
    className?: string;
}

export function CanvasFlashcardsView({
    content,
    serverData,
    conversationId,
    messageId,
    className,
}: CanvasFlashcardsViewProps) {
    // Parse cards
    const cards: FlashcardCard[] = useMemo(() => {
        if (serverData?.cards) {
            return serverData.cards
                .filter((c) => c.front && c.back)
                .map((c) => ({ front: c.front!, back: c.back! }));
        }
        if (content) {
            const parsed = parseFlashcards(content);
            return parsed.flashcards
                .filter((c) => c.front && c.back)
                .map((c) => ({ front: c.front, back: c.back! }));
        }
        return [];
    }, [content, serverData]);

    const {
        cardStats,
        studyStates,
        dueCards,
        totalReviews,
        masteryPercent,
        submitReview,
        resetProgress,
        isLoading,
        isSaved,
    } = useFlashcardStudy({
        cards,
        conversationId,
        messageId,
        title: 'Flashcards',
        autoSave: true,
    });

    const handleReview = (cardIndex: number, result: ReviewResult) => {
        submitReview(cardIndex, result);
    };

    const reviewedCount = cardStats.filter((s) => s.totalReviews > 0).length;
    const correctPercent = totalReviews > 0
        ? Math.round(
            (cardStats.reduce((sum, s) => sum + s.correct, 0) / totalReviews) * 100
        )
        : 0;

    if (cards.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No flashcards available
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Study progress header */}
            {isSaved && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-card/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{reviewedCount}/{cards.length} reviewed</span>
                        </div>
                        {totalReviews > 0 && (
                            <>
                                <span className="text-border">|</span>
                                <span>{correctPercent}% correct</span>
                                <span className="text-border">|</span>
                                <span>{masteryPercent}% mastered</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {dueCards.length > 0 && dueCards.length < cards.length && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                title={`${dueCards.length} cards due for review`}
                            >
                                <Zap className="h-3 w-3 mr-1" />
                                {dueCards.length} due
                            </Button>
                        )}
                        {totalReviews > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground"
                                onClick={resetProgress}
                                disabled={isLoading}
                                title="Reset all progress"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Mastery progress bar */}
            {isSaved && totalReviews > 0 && (
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${masteryPercent}%` }}
                    />
                </div>
            )}

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                {cards.map((card, index) => {
                    const stats = cardStats[index];
                    const studyState = studyStates[index];

                    return (
                        <FlashcardItem
                            key={`canvas-flashcard-${index}`}
                            front={card.front}
                            back={card.back}
                            index={index}
                            layoutMode="grid"
                            onReview={isSaved ? handleReview : undefined}
                            lastResult={stats?.lastResult ?? null}
                        />
                    );
                })}
            </div>
        </div>
    );
}
