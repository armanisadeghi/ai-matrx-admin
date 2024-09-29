// File location: app\(authenticated)\tests\flash-cards\types.ts

export type FlashcardData = {
    id: string;
    gradeLevel?: number;
    order: number;
    front: string;
    back: string;
    example?: string;
    isDeleted?: boolean;
    topic?: string;
    lesson?: string;
    detailedExplanation?: string;
    relatedImages?: string;
    personalNotes?: string;
}

export type Flashcard = FlashcardData & {
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
}

export type AiAssistModalTab = 'confused' | 'example' | 'question' | 'split' | 'combine' | 'compare';