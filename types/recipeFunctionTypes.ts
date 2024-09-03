// File location: @/types/recipeFunctionTypes

export type RoleType = "decision" | "validation" | "post_processing" | "pre-Processing" | "rating" | "comparison" | "save_data" | "other";

export type RecipeFunctionType = {
    id: string;
    recipe: string;
    function: string;
    role: RoleType;
    params?: Record<string, unknown>;

};
