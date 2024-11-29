// redux/features/recipes/recipeThunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../rootReducer';
import { initializeRecipeInstance, setActiveRecipe } from './recipeSlice';
import { loadBrokerTemplates, initializeBrokerInstances } from '../broker/brokerSlice';
import { recipeData } from './recipeData';
import { brokerData } from '../broker/data';
import { Broker } from '../broker/types';
import { getBrokerValuesForSubmission } from '../broker/selectors';

export const initializeRecipe = createAsyncThunk(
    'recipes/initialize',
    async (recipeId: string, { dispatch, getState }) => {
        const state = getState() as RootState;

        // Load broker templates if not already loaded
        if (Object.keys(state.brokers.brokerTemplates).length === 0) {
            const brokerTemplates = brokerData.reduce((acc, broker) => {
                acc[broker.id] = broker;
                return acc;
            }, {} as Record<string, Broker>);
            dispatch(loadBrokerTemplates(brokerTemplates));
        }

        // Initialize recipe instance if not already initialized
        if (!state.recipes.recipeInstances[recipeId]) {
            const recipe = recipeData.find(r => r.id === recipeId);
            if (!recipe) {
                throw new Error('Recipe not found');
            }
            dispatch(initializeRecipeInstance({
                recipeId,
                name: recipe.name,
                description: recipe.description,
                brokerIds: recipe.input_brokers,
            }));

            // Initialize broker instances for the recipe
            dispatch(initializeBrokerInstances({ recipeId, brokerIds: recipe.input_brokers }));
        }

        // Set as active recipe
        dispatch(setActiveRecipe(recipeId));
    }
);

export const submitRecipe = createAsyncThunk(
    'recipes/submit',
    async (recipeId: string, { getState, dispatch }) => {
        const state = getState() as RootState;
        const recipe = state.recipes.recipeInstances[recipeId];
        const brokerValues = getBrokerValuesForSubmission(recipeId)(state);

        if (!recipe) {
            throw new Error('Recipe instance not found');
        }

        // Check if all brokers are ready
        const allBrokersReady = brokerValues.every(broker => broker.ready);

        if (!allBrokersReady) {
            throw new Error('Not all required brokers are ready');
        }

        // Prepare taskData for submission
        const taskData = {
            recipe_id: recipeId,
            broker_values: brokerValues,
            overrides: recipe.overrides,
            stream: recipe.stream,
        };

        // This is where you would dispatch an action to submit the recipe
        // For now, we'll just return the taskData
        return taskData;
    }
);
