// File location: @/types/recipeToolTypes

export type RecipeToolType = {
    id: string;
    recipe: string;
    tool: string;
    params?: Record<string, unknown>;

};
