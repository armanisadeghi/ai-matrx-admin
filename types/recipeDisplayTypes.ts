// File location: @/types/recipeDisplayTypes

export type RecipeDisplayType = {
    id: string;
    recipe: string;
    display: string;
    priority?: number;
    displaySettings?: Record<string, unknown>;

};
