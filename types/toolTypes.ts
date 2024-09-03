// File location: @/types/toolTypes

import { RecipeToolType } from '@/types/recipeToolTypes';

export type ToolType = {
    id: string;
    name: string;
    source: Record<string, unknown>;
    description?: string;
    parameters?: Record<string, unknown>;
    requiredArgs?: Record<string, unknown>;
    systemFunction?: string;
    additionalParams?: Record<string, unknown>;
    recipeTool?: RecipeToolType[];
};
