/**
 * Token counting utility using js-tiktoken (lightweight version)
 * 
 * Simple, fast token counting for OpenAI models using o200k_base encoding.
 * Works locally - no API calls, no keys needed.
 * 
 * Defaults to GPT-5 / latest OpenAI models.
 */

import { Tiktoken } from 'js-tiktoken/lite';
import o200k_base from 'js-tiktoken/ranks/o200k_base';

/**
 * Token counter using o200k_base encoding (GPT-4o, GPT-5, and newer models)
 */
let tokenizer: Tiktoken | null = null;

function getTokenizer(): Tiktoken {
    if (!tokenizer) {
        tokenizer = new Tiktoken(o200k_base);
    }
    return tokenizer;
}

export interface TokenCountResult {
    tokens: number;
    characters: number;
}


/**
 * Count tokens in text using o200k_base encoding (GPT-5, GPT-4o, and newer models)
 * 
 * Simple, fast, and accurate for all modern OpenAI models.
 * Works locally - no API calls needed.
 * 
 * @param text - The text to count tokens for
 * @returns Object with token count and character count
 * 
 * @example
 * ```typescript
 * const result = countTokens("Hello world");
 * console.log(result.tokens); // 2
 * console.log(result.characters); // 11
 * ```
 */
export function countTokens(text: string): TokenCountResult {
    try {
        if (!text || typeof text !== 'string') {
            return {
                tokens: 0,
                characters: 0,
            };
        }

        const enc = getTokenizer();
        const tokens = enc.encode(text);
        
        return {
            tokens: tokens.length,
            characters: text.length,
        };
    } catch (error) {
        console.error('Error counting tokens:', error);

        // Fallback to simple estimation (1 token ≈ 4 characters)
        const estimatedTokens = Math.ceil(text.length / 4);
        return {
            tokens: estimatedTokens,
            characters: text.length,
        };
    }
}

/**
 * Format token count for display with comma separators
 */
export function formatTokenCount(tokens: number): string {
    return tokens.toLocaleString();
}

