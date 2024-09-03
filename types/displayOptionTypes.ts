// File location: @/types/displayOptionTypes

import { RecipeDisplayType } from '@/types/recipeDisplayTypes';

export type DisplayOptionType = {
    id: string;
    name?: string;
    defaultParams?: Record<string, unknown>;
    customizableParams?: Record<string, unknown>;
    additionalParams?: Record<string, unknown>;
    recipeDisplay?: RecipeDisplayType[];
};
