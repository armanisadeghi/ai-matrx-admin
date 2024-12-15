import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {SmartButtonProps} from "./types";
import React from "react";
import {cn} from '@/utils';

export const FlashcardSelect: React.FC<SmartButtonProps> = ({flashcardHook, className}) => (
    <Select
        onValueChange={flashcardHook.handleSelectChange}
        value={flashcardHook.currentIndex.toString()}
    >
        <SelectTrigger className={cn("w-full bg-card", className)}>
            <SelectValue placeholder="Select a flashcard"/>
        </SelectTrigger>
        <SelectContent>
            {flashcardHook.allFlashcards.map((card, index) => (
                <SelectItem
                    key={card.order}
                    value={index.toString()}
                >
                    {`${card.order}: ${card.front.length > 50 ? card.front.substring(0, 50) + '...' : card.front}`}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

export default FlashcardSelect;
