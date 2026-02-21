"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/styles/themes/utils";

interface FlashcardItemProps {
    front: string;
    back: string;
    index: number;
    layoutMode?: "grid" | "list";
}

const FlashcardItem: React.FC<FlashcardItemProps> = ({ front, back, index, layoutMode = "grid" }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const isMultiLineBack = back.includes('\n');

    const handleClick = () => {
        setIsFlipped(!isFlipped);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
        }
    };

    const getTextSizeClass = (text: string, isMultiLine: boolean = false) => {
        const length = text.length;

        if (isMultiLine) {
            if (layoutMode === "list") {
                if (length < 120) return "text-sm md:text-base";
                return "text-xs md:text-sm";
            }
            if (length < 150) return "text-lg";
            if (length < 250) return "text-base md:text-lg";
            return "text-sm md:text-base";
        }

        if (layoutMode === "list") {
            if (length < 80) return "text-xl md:text-2xl";
            if (length < 150) return "text-lg md:text-xl";
            if (length < 250) return "text-base md:text-lg";
            return "text-sm md:text-base";
        } else {
            if (length < 50) return "text-lg md:text-xl";
            if (length < 100) return "text-base md:text-lg";
            if (length < 200) return "text-sm md:text-base";
            return "text-xs md:text-sm";
        }
    };

    const renderBackContent = () => {
        if (!isMultiLineBack) {
            return back;
        }

        return back.split('\n').map((line, i) => (
            <div key={i} className={line === '' ? 'h-1.5' : undefined}>
                {line}
            </div>
        ));
    };

    return (
        <div
            className={cn(
                "relative w-full cursor-pointer group",
                isMultiLineBack ? "h-56" : "h-48",
                "animate-in fade-in duration-300",
            )}
            style={{
                perspective: '1000px',
            }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            aria-label={`Flashcard ${index + 1}. Click to flip. ${isFlipped ? 'Showing back' : 'Showing front'}`}
        >
            <div
                className={cn(
                    "relative w-full h-full transition-transform duration-500",
                )}
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                {/* Front of card */}
                <Card
                    className={cn(
                        "absolute w-full h-full overflow-hidden",
                        "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950",
                        "border-2 border-blue-200 dark:border-blue-800",
                        "shadow-lg hover:shadow-xl transition-shadow"
                    )}
                    style={{
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <CardContent className="flex flex-col items-center justify-center h-full p-4 relative">
                        <div
                            className={cn(
                                "text-center font-medium text-gray-800 dark:text-gray-200 leading-relaxed",
                                "max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-700",
                                "px-2",
                                getTextSizeClass(front)
                            )}
                        >
                            {front}
                        </div>
                        {isHovered && (
                            <div className="absolute bottom-2 text-[10px] text-blue-600/70 dark:text-blue-400/70 animate-in fade-in duration-200">
                                Click to flip
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Back of card */}
                <Card
                    className={cn(
                        "absolute w-full h-full overflow-hidden",
                        "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
                        "border-2 border-green-200 dark:border-green-800",
                        "shadow-lg hover:shadow-xl transition-shadow"
                    )}
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    <CardContent className={cn(
                        "flex flex-col h-full p-4 relative",
                        isMultiLineBack ? "items-start justify-start pt-5" : "items-center justify-center"
                    )}>
                        <div
                            className={cn(
                                "font-medium text-foreground",
                                "max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-green-300 dark:scrollbar-thumb-green-700",
                                "px-1 w-full",
                                isMultiLineBack
                                    ? "text-left leading-snug"
                                    : "text-center leading-relaxed",
                                getTextSizeClass(back, isMultiLineBack)
                            )}
                        >
                            {renderBackContent()}
                        </div>
                        {isHovered && (
                            <div className="absolute bottom-2 right-0 left-0 text-center text-[10px] text-green-600/70 dark:text-green-400/70 animate-in fade-in duration-200">
                                Click to flip back
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FlashcardItem;

