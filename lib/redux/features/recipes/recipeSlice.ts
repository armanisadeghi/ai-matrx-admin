// redux/features/recipes/recipeSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BrokerValue } from '@/redux/features/broker/types';

export interface RecipeInstance {
    recipe_id: string;
    name: string;
    description: string;
    overrides: {
        model_override: string;
        processor_overrides: Record<string, any>;
        other_overrides: Record<string, any>;
    };
    stream: boolean;
    background_task: boolean;
    brokerIds: string[];
}

interface RecipeState {
    recipeInstances: Record<string, RecipeInstance>;
    activeRecipeIds: string[];
}

const initialState: RecipeState = {
    recipeInstances: {},
    activeRecipeIds: [],
};

const recipeSlice = createSlice({
    name: 'recipes',
    initialState,
    reducers: {
        initializeRecipeInstance: (state, action: PayloadAction<{
            recipeId: string;
            name: string;
            description: string;
            brokerIds: string[];
        }>) => {
            const { recipeId, name, description, brokerIds } = action.payload;
            state.recipeInstances[recipeId] = {
                recipe_id: recipeId,
                name,
                description,
                overrides: {
                    model_override: '',
                    processor_overrides: {},
                    other_overrides: {},
                },
                stream: true,
                background_task: false,
                brokerIds,
            };
        },
        setActiveRecipe: (state, action: PayloadAction<string>) => {
            if (!state.activeRecipeIds.includes(action.payload)) {
                state.activeRecipeIds.push(action.payload);
            }
        },
        removeActiveRecipe: (state, action: PayloadAction<string>) => {
            state.activeRecipeIds = state.activeRecipeIds.filter(id => id !== action.payload);
        },
        updateRecipeOverrides: (state, action: PayloadAction<{
            recipeId: string;
            overrides: Partial<RecipeInstance['overrides']>;
        }>) => {
            const { recipeId, overrides } = action.payload;
            if (state.recipeInstances[recipeId]) {
                state.recipeInstances[recipeId].overrides = {
                    ...state.recipeInstances[recipeId].overrides,
                    ...overrides,
                };
            }
        },
        updateRecipeSettings: (state, action: PayloadAction<{
            recipeId: string;
            settings: Partial<Omit<RecipeInstance, 'recipe_id' | 'overrides' | 'brokerIds'>>;
        }>) => {
            const { recipeId, settings } = action.payload;
            if (state.recipeInstances[recipeId]) {
                Object.assign(state.recipeInstances[recipeId], settings);
            }
        },
        removeRecipeInstance: (state, action: PayloadAction<string>) => {
            const recipeId = action.payload;
            delete state.recipeInstances[recipeId];
            state.activeRecipeIds = state.activeRecipeIds.filter(id => id !== recipeId);
        },
    },
});

export const {
    initializeRecipeInstance,
    setActiveRecipe,
    removeActiveRecipe,
    updateRecipeOverrides,
    updateRecipeSettings,
    removeRecipeInstance,
} = recipeSlice.actions;

export default recipeSlice.reducer;
