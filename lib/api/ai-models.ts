import { createClient } from "@/utils/supabase/server";
import { cache } from 'react';

/**
 * Internal function to fetch AI models from Supabase
 * Uses React cache() which works reliably in both development and production
 */
async function _fetchAIModelsFromDB() {
    const supabase = await createClient();

    // Fetch all non-deprecated AI models
    const { data: models, error } = await supabase
        .from("ai_model")
        .select("*")
        .eq("is_deprecated", false)
        .order("common_name", { ascending: true });

    if (error) {
        console.error("Error fetching AI models from database:", error);
        throw error;
    }

    return models || [];
}

/**
 * Fetches AI models directly from Supabase (Server-side)
 * Uses React cache() for request deduplication
 * This avoids HTTP requests to ourselves in serverless environments
 * Works reliably in both development and production
 */
export const fetchAIModels = cache(async () => {
    try {
        return await _fetchAIModelsFromDB();
    } catch (error) {
        console.error("Error fetching AI models:", error);
        // Return empty array as fallback to prevent page crashes
        return [];
    }
});

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

