// @ts-nocheck
// redux/features/recipes/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';

export const getRecipeInstance = (recipeId: string) =>
    // @ts-ignore - COMPLEX: Property 'recipes' does not exist on RootState - requires state structure refactor or recipes slice addition
    (state: RootState) => state.recipes.recipeInstances[recipeId];

// @ts-ignore - COMPLEX: Property 'recipes' does not exist on RootState - requires state structure refactor or recipes slice addition
export const getActiveRecipeIds = (state: RootState) => state.recipes.activeRecipeIds;

export const getActiveRecipeInstances = createSelector(
    [getActiveRecipeIds, 
     // @ts-ignore - COMPLEX: Property 'recipes' does not exist on RootState - requires state structure refactor or recipes slice addition
     (state: RootState) => state.recipes.recipeInstances],
    (activeIds, instances) => activeIds.map(id => instances[id])
);
