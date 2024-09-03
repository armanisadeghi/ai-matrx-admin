// File location: @/types/systemFunctionTypes

import { RecipeFunctionType } from '@/types/recipeFunctionTypes';
import { ToolType } from '@/types/toolTypes';
import { RecipeToolType } from '@/types/recipeToolTypes';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

export type SystemFunctionType = {
    id: string;
    name: string;
    description?: string;
    sample?: string;
    inputParams?: Record<string, unknown>;
    outputOptions?: Record<string, unknown>;
    rfId: string;
    recipeFunction?: RecipeFunctionType[];
    tool?: ToolType[];
    registeredFunction?: RegisteredFunctionType[];
    recipeTool?: RecipeToolType[];
};
