/**
 * Parser for flashcard content
 * Handles both "Front/Back" and "Question/Answer" formats
 * Supports optional thematic breaks (---)
 */

export interface Flashcard {
    front: string;
    back: string;
}

export interface FlashcardParseResult {
    flashcards: Flashcard[];
    isComplete: boolean;
    partialCard: Partial<Flashcard> | null;
}

/**
 * Parse flashcard content into individual cards
 * Only returns complete flashcards (both front and back present)
 */
export const parseFlashcards = (content: string): FlashcardParseResult => {
    const lines = content.split('\n');
    const flashcards: Flashcard[] = [];
    let currentCard: Partial<Flashcard> = {};
    let partialCard: Partial<Flashcard> | null = null;
    let isComplete = false;

    // Check if content has closing tag
    isComplete = content.includes('</flashcards>');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and separators at the start
        if (!line || line === '---') {
            // If we have a complete card, save it
            if (currentCard.front && currentCard.back) {
                flashcards.push({
                    front: currentCard.front,
                    back: currentCard.back,
                });
                currentCard = {};
            }
            continue;
        }

        // Match Front: or Question: format
        const frontMatch = line.match(/^(?:Front|Question):\s*(.+)/i);
        if (frontMatch) {
            // If we have a complete card, save it
            if (currentCard.front && currentCard.back) {
                flashcards.push({
                    front: currentCard.front,
                    back: currentCard.back,
                });
                currentCard = {};
            }
            currentCard.front = frontMatch[1].trim();
            continue;
        }

        // Match Back: or Answer: format
        const backMatch = line.match(/^(?:Back|Answer):\s*(.+)/i);
        if (backMatch) {
            currentCard.back = backMatch[1].trim();
            
            // If we now have both front and back, the card is potentially complete
            // But we'll wait for the next separator or end to confirm
            continue;
        }

        // If we have front but no back yet, this might be continuation of front text
        if (currentCard.front && !currentCard.back && line) {
            // Check if this is actually a continuation or a new field
            if (!line.match(/^(?:Back|Answer):/i)) {
                currentCard.front += ' ' + line;
            }
        }
        // If we have both front and back, this might be continuation of back text
        else if (currentCard.front && currentCard.back && line) {
            // Check if this is a continuation
            if (!line.match(/^(?:Front|Question|Back|Answer):/i) && line !== '---') {
                currentCard.back += ' ' + line;
            }
        }
    }

    // Handle the last card
    if (currentCard.front && currentCard.back) {
        if (isComplete) {
            // Content is complete, add the last card
            flashcards.push({
                front: currentCard.front,
                back: currentCard.back,
            });
            partialCard = null;
        } else {
            // Content is still streaming, keep the last card as partial
            partialCard = currentCard;
        }
    } else if (currentCard.front || currentCard.back) {
        // Incomplete card
        partialCard = currentCard;
    }

    return {
        flashcards,
        isComplete,
        partialCard,
    };
};

