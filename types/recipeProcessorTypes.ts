// File location: @/types/recipeProcessorTypes

export type RecipeProcessorType = {
    id: string;
    recipe: string;
    processor: string;
    params?: Record<string, unknown>;

};
