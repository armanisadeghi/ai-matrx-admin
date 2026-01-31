// FlashcardButtons.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import {
    AArrowDown,
    AArrowUp,
    ArrowLeft,
    ArrowRight,
    Shuffle,
    Headphones,
    MessageSquare
} from 'lucide-react';
import {SmartButtonProps} from "./types";

export const PreviousButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={flashcardHook.handlePrevious}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Previous"
    >
        <ArrowLeft className="h-6 w-6"/>
    </Button>
);

export const NextButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={flashcardHook.handleNext}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Next"
    >
        <ArrowRight className="h-6 w-6"/>
    </Button>
);

export const ShuffleButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={flashcardHook.shuffleCards}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Shuffle"
    >
        <Shuffle className="h-6 w-6"/>
    </Button>
);

export const DecreaseFontButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={() => flashcardHook.setFontSize((prev) => Math.max(18, prev - 2))}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Decrease font size"
    >
        <AArrowDown className="h-6 w-6"/>
    </Button>
);

export const IncreaseFontButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={() => flashcardHook.setFontSize((prev) => Math.min(36, prev + 2))}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Increase font size"
    >
        <AArrowUp className="h-6 w-6"/>
    </Button>
);

export const AudioHelpButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={flashcardHook.audioModalActions.playActiveCardAudio}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="I'm confused (Audio help)"
    >
        <Headphones className="h-6 w-6"/>
    </Button>
);

export const ChatHelpButton: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <Button
        onClick={flashcardHook.textModalActions.openAiModal}
        variant="outline"
        size="icon"
        className={`w-10 h-10 hover:scale-105 transition-transform bg-card ${className || ''}`}
        title="Ask a question (Chat)"
    >
        <MessageSquare className="h-6 w-6"/>
    </Button>
);

export const NavigationButtonGroup: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
        <PreviousButton flashcardHook={flashcardHook} />
        <NextButton flashcardHook={flashcardHook} />
        <ShuffleButton flashcardHook={flashcardHook} />
    </div>
);

export const FontControlButtonGroup: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
        <DecreaseFontButton flashcardHook={flashcardHook} />
        <IncreaseFontButton flashcardHook={flashcardHook} />
    </div>
);

export const HelpButtonGroup: React.FC<SmartButtonProps> = ({ flashcardHook, className }) => (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
        <AudioHelpButton flashcardHook={flashcardHook} />
        <ChatHelpButton flashcardHook={flashcardHook} />
    </div>
);
