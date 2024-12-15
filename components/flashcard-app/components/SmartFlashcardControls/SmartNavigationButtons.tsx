import React from "react";
import {SmartButtonProps} from "@/components/flashcard-app/components/SmartFlashcardControls/types";
import {ArrowLeft, ArrowRight, Shuffle} from "lucide-react";
import {Button} from "@/components/ui";

export const NavigationButton: React.FC<SmartButtonProps & { type: 'previous' | 'next' | 'shuffle' }> = (
    {
        flashcardHook, type, className
    }) => {
    const config = {
        previous: {icon: ArrowLeft, action: flashcardHook.handlePrevious, title: 'Previous'},
        next: {icon: ArrowRight, action: flashcardHook.handleNext, title: 'Next'},
        shuffle: {icon: Shuffle, action: flashcardHook.shuffleCards, title: 'Shuffle'}
    }[type];
    const Icon = config.icon;

    return (
        <Button
            onClick={config.action}
            variant="outline"
            size="icon"
            className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
            title={config.title}
        >
            <Icon className="h-6 w-6"/>
        </Button>
    );
};

export default NavigationButton;
