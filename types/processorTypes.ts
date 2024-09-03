// File location: @/types/processorTypes

import { RecipeProcessorType } from '@/types/recipeProcessorTypes';

export type ProcessorType = {
    id: string;
    name: string;
    dependsDefault?: string;
    defaultExtractors?: Record<string, unknown>;
    params?: Record<string, unknown>;
    processor?: ProcessorType[];
    recipeProcessor?: RecipeProcessorType[];
};
