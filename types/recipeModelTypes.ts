// File location: @/types/recipeModelTypes

export type RoleType = "primary_model" | "verified_model" | "trial_model";

export type RecipeModelType = {
    id: string;
    recipe: string;
    aiModel: string;
    role: RoleType;
    priority?: number;

};
