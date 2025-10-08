/**
 * Client-side API utilities for fetching AI models
 * For server-side fetching, use lib/api/ai-models-server.ts
 */

/**
 * Fetches AI models from the cached API endpoint (Client-side)
 * Uses browser caching
 */
export async function fetchAIModelsClient() {
    try {
        const response = await fetch('/api/ai-models', {
            cache: 'force-cache'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch AI models: ${response.statusText}`);
        }

        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error("Error fetching AI models:", error);
        return [];
    }
}

/**
 * Type for AI Model (basic structure)
 * Extend this as needed based on your actual schema
 */
export type AIModel = {
    id: string;
    is_deprecated: boolean;
    [key: string]: unknown;
};

