'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    fetchAvailableModels,
    selectAvailableModels,
    selectModelRegistryLoading,
    selectModelRegistryError,
    selectModelOptions,
    selectModelById,
    selectModelControls,
    type AIModel,
} from '@/lib/redux/slices/modelRegistrySlice';

/**
 * Single source of truth for AI model data.
 *
 * All client components MUST use this hook instead of fetching models
 * directly from Supabase, `/api/ai-models`, or any other source.
 *
 * Models are normalised (legacy keys renamed) at the Redux boundary,
 * so consumers never see deprecated field names.
 */
export function useModels() {
    const dispatch = useAppDispatch();
    const models = useAppSelector(selectAvailableModels);
    const isLoading = useAppSelector(selectModelRegistryLoading);
    const error = useAppSelector(selectModelRegistryError);

    useEffect(() => {
        if (models.length === 0 && !isLoading) {
            dispatch(fetchAvailableModels());
        }
    }, [dispatch, models.length, isLoading]);

    return { models, isLoading, error };
}

/**
 * Returns models formatted as { value, label, provider } for dropdowns.
 * Triggers a fetch if the registry is empty.
 */
export function useModelOptions() {
    const { isLoading, error } = useModels();
    const options = useAppSelector(selectModelOptions);
    return { options, isLoading, error };
}

/**
 * Look up a single model by ID from the registry.
 */
export function useModelById(modelId: string): AIModel | undefined {
    const { models } = useModels();
    return models.find(m => m.id === modelId);
}

export { selectModelControls, selectModelById, type AIModel };
