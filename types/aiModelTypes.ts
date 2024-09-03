// File location: @/types/aiModelTypes

import { RecipeModelType } from '@/types/recipeModelTypes';

export type AiModelType = {
    id: string;
    name: string;
    commonName?: string;
    class: string;
    provider?: string;
    endpoints?: Record<string, unknown>;
    contextWindow?: number;
    maxTokens?: number;
    capabilities?: Record<string, unknown>;
    controls?: Record<string, unknown>;
    recipeModel?: RecipeModelType[];
};
