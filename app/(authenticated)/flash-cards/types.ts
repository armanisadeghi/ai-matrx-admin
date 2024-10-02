// File location: app\(authenticated)\tests\flash-cards\types.ts

export type FlashcardData = {
    id?: string;
    order: number;
    topic?: string;
    lesson?: string;
    gradeLevel?: number;
    front: string;
    back: string;
    example?: string;
    detailedExplanation?: string;
    audioExplanation?: string;
    relatedImages?: string[];
    personalNotes?: string;
    isDeleted?: boolean;
}

export type Flashcard = FlashcardData & {
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
}

export type AiAssistModalTab = 'confused' | 'example' | 'question' | 'split' | 'combine' | 'compare';
