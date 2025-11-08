import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
    UserPreferences,
    saveModulePreferencesToDatabase,
    resetModulePreferences 
} from '@/lib/redux/slices/userPreferencesSlice';

/**
 * Hook for managing a specific preference module
 * 
 * Provides functions to save and reset just one module
 * without affecting other preferences
 * 
 * @example
 * ```tsx
 * const { save, reset, isLoading, hasChanges } = useModulePreferences('prompts');
 * 
 * // Save only prompts preferences
 * await save();
 * 
 * // Reset prompts to defaults
 * reset();
 * ```
 */
export function useModulePreferences(module: keyof UserPreferences) {
    const dispatch = useAppDispatch();
    const preferences = useAppSelector(state => state.userPreferences);
    const modulePreferences = preferences[module];
    const meta = preferences._meta;

    const save = useCallback(async () => {
        try {
            await dispatch(saveModulePreferencesToDatabase({ 
                module, 
                preferences: modulePreferences 
            })).unwrap();
            return { success: true };
        } catch (error) {
            console.error(`Failed to save ${module} preferences:`, error);
            return { success: false, error };
        }
    }, [dispatch, module, modulePreferences]);

    const reset = useCallback(() => {
        dispatch(resetModulePreferences(module));
    }, [dispatch, module]);

    return {
        save,
        reset,
        modulePreferences,
        isLoading: meta?.isLoading || false,
        hasChanges: meta?.hasUnsavedChanges || false,
        error: meta?.error || null,
    };
}

