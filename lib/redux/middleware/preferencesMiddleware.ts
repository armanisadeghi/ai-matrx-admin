// lib/redux/middleware/preferencesMiddleware.ts

import { Middleware, Action } from 'redux';
import { supabase } from "@/utils/supabase/client";
import type { RootState, AppThunk } from '../store';

export const preferencesMiddleware: Middleware<{}, RootState> = store => next => (action: Action) => {
    const result = next(action);

    if ('type' in action && typeof action.type === 'string' && action.type.startsWith('userPreferences/')) {
        const userPreferences = store.getState().userPreferences;
        const userId = store.getState().user.id;

        // Sync with local storage
        if (typeof window !== 'undefined') {
            localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
        }

        // Sync with Supabase
        if (userId) {
            supabase
                .from('user_preferences')
                .upsert({ user_id: userId, preferences: userPreferences })
                .then(({ error }) => {
                    if (error) console.error('Error syncing preferences with Supabase:', error);
                });
        }
    }

    return result;
};

export const loadPreferences = (): AppThunk => async (dispatch, getState) => {
    const userId = getState().user.id;

    // Load from local storage
    if (typeof window !== 'undefined') {
        const storedPreferences = localStorage.getItem('userPreferences');
        if (storedPreferences) {
            const preferences = JSON.parse(storedPreferences);

            // Convert any Date fields to strings if needed
            if (preferences.lastUpdated && preferences.lastUpdated instanceof Date) {
                preferences.lastUpdated = preferences.lastUpdated.toISOString();
            }

            dispatch({ type: 'userPreferences/setAllPreferences', payload: preferences });
        }
    }

    // Load from Supabase
    if (userId) {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error loading preferences from Supabase:', error);
        } else if (data) {
            const preferences = data.preferences;

            // Convert any Date fields to strings
            if (preferences.lastUpdated && preferences.lastUpdated instanceof Date) {
                preferences.lastUpdated = preferences.lastUpdated.toISOString();
            }

            dispatch({ type: 'userPreferences/setAllPreferences', payload: preferences });
        }
    }
};
