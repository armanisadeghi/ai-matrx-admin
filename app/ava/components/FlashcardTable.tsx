// File location: app\(authenticated)\tests\flash-cards\components\FlashcardTable.tsx

'use client'

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { Flashcard } from "@/types/flashcards.types";

interface FlashcardTableProps {
    cards: Flashcard[];
    onEditCard: (card: Flashcard) => void;
    onSelectCard: (index: number) => void;
}

const FlashcardTable: React.FC<FlashcardTableProps> = ({ cards, onEditCard, onSelectCard }) => {
    const getPerformanceColor = (percentage: number, reviewCount: number) => {
        if (reviewCount === 0) return "text-gray-500";
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 60) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="w-full max-w-4xl mt-12 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Review Count</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Incorrect</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cards.map((card, index) => {
                        const percentage = card.reviewCount > 0
                            ? (card.correctCount / card.reviewCount) * 100
                            : 0;
                        return (
                            <TableRow key={card.order} className="cursor-pointer" onClick={() => onSelectCard(index)}>
                                <TableCell>{card.front}</TableCell>
                                <TableCell>{card.reviewCount}</TableCell>
                                <TableCell>{card.correctCount}</TableCell>
                                <TableCell>{card.incorrectCount}</TableCell>
                                <TableCell className={getPerformanceColor(percentage, card.reviewCount)}>
                                    {percentage.toFixed(1)}%
                                </TableCell>
                                <TableCell>
                                    <Button onClick={(e) => { e.stopPropagation(); onEditCard(card); }} variant="outline">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default FlashcardTable;