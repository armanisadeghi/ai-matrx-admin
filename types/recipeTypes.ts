// File location: @/types/recipeTypes

import { RecipeBrokerType } from '@/types/recipeBrokerTypes';
import { RecipeDisplayType } from '@/types/recipeDisplayTypes';
import { RecipeFunctionType } from '@/types/recipeFunctionTypes';
import { RecipeModelType } from '@/types/recipeModelTypes';
import { RecipeProcessorType } from '@/types/recipeProcessorTypes';
import { RecipeToolType } from '@/types/recipeToolTypes';

export type StatusType = "live" | "draft" | "in_review" | "active_testing" | "archived" | "other";

export type RecipeType = {
    id: string;
    name: string;
    description?: string;
    tags?: Record<string, unknown>;
    sampleOutput?: string;
    isPublic?: boolean;
    status: StatusType;
    version?: number;
    messages?: any[];
    postResultOptions?: Record<string, unknown>;
    recipeBroker?: RecipeBrokerType[];
    recipeDisplay?: RecipeDisplayType[];
    recipeFunction?: RecipeFunctionType[];
    recipeModel?: RecipeModelType[];
    recipeProcessor?: RecipeProcessorType[];
    recipeTool?: RecipeToolType[];
};
