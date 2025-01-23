// features\rich-text-editor\utils\editorStateUtils.ts

import { EditorState } from "../types/editor.types";
import { MATRX_PATTERN } from "./patternUtils";

export type EditorStateUtils = {
    formatForDisplay: (text: string) => string;
    formatForRaw: (text: string) => string;
    cleanState: (state: unknown) => unknown;
};

export const editorStateUtils: EditorStateUtils = {
    formatForDisplay: (text: string): string => {
        if (!text) return '';
        return text.replace(/ /g, '␣').replace(/\n/g, '↵\n');
    },

    formatForRaw: (text: string): string => {
        if (!text) return '';
        return text.replace(/␣/g, ' ').replace(/↵\n/g, '\n');
    },

    cleanState: (state: unknown): unknown => {
        if (!state || typeof state !== 'object') {
            return state;
        }

        if (state instanceof Map) {
            return {
                __type: 'Map',
                value: Array.from(state.entries())
            };
        }

        if (Array.isArray(state)) {
            return state.map(item => editorStateUtils.cleanState(item));
        }

        const cleanedState: Record<string, unknown> = {};
        Object.entries(state as Record<string, unknown>).forEach(([key, value]) => {
            // Handle nested Maps
            if (value instanceof Map) {
                cleanedState[key] = {
                    __type: 'Map',
                    value: Array.from(value.entries())
                };
                return;
            }

            // Clean nested objects
            if (value && typeof value === 'object') {
                cleanedState[key] = editorStateUtils.cleanState(value);
                return;
            }

            cleanedState[key] = value;
        });

        return cleanedState;
    }
};


/**
 * Processes editor content by replacing chip IDs with their string values
 */
export const replaceChipsWithStringValues = (
    state: Pick<EditorState, 'plainTextContent' | 'chipData'>,
    showTokenIds = false
): string => {
    if (!state.plainTextContent) return '';
    
    // Create efficient lookup map for chips
    const chipMap = new Map(
        state.chipData?.map(chip => [chip.id, chip]) ?? []
    );
    
    // Reset the pattern's lastIndex
    MATRX_PATTERN.lastIndex = 0;
    
    return state.plainTextContent.replace(
        MATRX_PATTERN,
        (match, tokenId) => {
            if (showTokenIds) return match;
            return chipMap.get(tokenId)?.stringValue ?? match;
        }
    );
};