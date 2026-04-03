/**
 * Flashcard Persistence Types
 *
 * Lightweight types for the user_flashcard_sets and user_flashcard_reviews tables.
 * These flashcard sets are auto-generated from chat and linked to cx_message/cx_conversation.
 */

// ============================================================================
// Card & Review primitives
// ============================================================================

export interface FlashcardCard {
    front: string;
    back: string;
}

export type ReviewResult = 'correct' | 'partial' | 'incorrect';

// ============================================================================
// Database row types
// ============================================================================

export interface FlashcardSetRow {
    id: string;
    user_id: string;
    conversation_id: string | null;
    message_id: string | null;
    title: string;
    cards: FlashcardCard[];
    card_count: number;
    tags: string[];
    is_archived: boolean;
    last_studied_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface FlashcardReviewRow {
    id: string;
    user_id: string;
    set_id: string;
    card_index: number;
    result: ReviewResult;
    reviewed_at: string;
}

// ============================================================================
// Insert types
// ============================================================================

export interface FlashcardSetInsert {
    conversation_id?: string;
    message_id?: string;
    title?: string;
    cards: FlashcardCard[];
    tags?: string[];
}

export interface FlashcardReviewInsert {
    set_id: string;
    card_index: number;
    result: ReviewResult;
}

// ============================================================================
// Aggregated card stats (computed from review log)
// ============================================================================

export interface CardReviewStats {
    cardIndex: number;
    correct: number;
    partial: number;
    incorrect: number;
    totalReviews: number;
    lastReviewedAt: string | null;
    lastResult: ReviewResult | null;
}

export interface FlashcardSetWithStats extends FlashcardSetRow {
    cardStats: CardReviewStats[];
    totalReviews: number;
    masteryPercent: number; // 0-100
}

// ============================================================================
// Spaced repetition box assignment
// ============================================================================

export type LeitnerBox = 1 | 2 | 3;

export interface CardStudyState {
    cardIndex: number;
    box: LeitnerBox;
    isDue: boolean;
    lastReviewedAt: string | null;
    lastResult: ReviewResult | null;
}
