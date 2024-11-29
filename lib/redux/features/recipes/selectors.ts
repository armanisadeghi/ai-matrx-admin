// redux/features/recipes/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../rootReducer';

export const getRecipeInstance = (recipeId: string) =>
    (state: RootState) => state.recipes.recipeInstances[recipeId];

export const getActiveRecipeIds = (state: RootState) => state.recipes.activeRecipeIds;

export const getActiveRecipeInstances = createSelector(
    [getActiveRecipeIds, (state: RootState) => state.recipes.recipeInstances],
    (activeIds, instances) => activeIds.map(id => instances[id])
);
