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

    const handleClick = () => {
        setIsFlipped(!isFlipped);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
        }
    };

    // Calculate text size based on content length and layout mode
    // List mode has more horizontal space, so we can use larger text
    const getTextSizeClass = (text: string) => {
        const length = text.length;
        
        if (layoutMode === "list") {
            // More generous sizing for list mode (full width)
            if (length < 80) return "text-xl md:text-2xl";
            if (length < 150) return "text-lg md:text-xl";
            if (length < 250) return "text-base md:text-lg";
            return "text-sm md:text-base";
        } else {
            // Tighter sizing for grid mode (half width on desktop)
            if (length < 50) return "text-lg md:text-xl";
            if (length < 100) return "text-base md:text-lg";
            if (length < 200) return "text-sm md:text-base";
            return "text-xs md:text-sm";
        }
    };

    return (
        <div
            className={cn(
                "relative w-full h-48 cursor-pointer group",
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
                    <CardContent className="flex flex-col items-center justify-center h-full p-4 relative">
                        <div 
                            className={cn(
                                "text-center font-medium text-gray-800 dark:text-gray-200 leading-relaxed",
                                "max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-green-300 dark:scrollbar-thumb-green-700",
                                "px-2",
                                getTextSizeClass(back)
                            )}
                        >
                            {back}
                        </div>
                        {isHovered && (
                            <div className="absolute bottom-2 text-[10px] text-green-600/70 dark:text-green-400/70 animate-in fade-in duration-200">
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

