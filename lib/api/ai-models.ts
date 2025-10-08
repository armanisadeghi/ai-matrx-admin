/**
 * Fetches AI models from the cached API endpoint (Server-side)
 * Data is cached for 12 hours on the server
 */
export async function fetchAIModels() {
    try {
        // Construct the full URL for server-side fetching
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/ai-models`, {
            next: { 
                revalidate: 43200, // 12 hours in seconds
                tags: ['ai-models'] // Tag for cache invalidation
            }
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

