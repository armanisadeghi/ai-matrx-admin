// lib/redux/slices/adminPreferencesSlice.ts
// Lightweight admin preferences - only used when user is admin
// No impact on non-admin users

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ServerEnvironment = 'production' | 'localhost';

interface AdminPreferencesState {
    // Server override - null means use default (production)
    serverOverride: ServerEnvironment | null;
    // Add other admin preferences here as needed
}

const initialState: AdminPreferencesState = {
    serverOverride: null,
};

const adminPreferencesSlice = createSlice({
    name: 'adminPreferences',
    initialState,
    reducers: {
        setServerOverride: (state, action: PayloadAction<ServerEnvironment | null>) => {
            state.serverOverride = action.payload;
        },
        clearAdminPreferences: () => initialState,
    },
});

export const { setServerOverride, clearAdminPreferences } = adminPreferencesSlice.actions;
export default adminPreferencesSlice.reducer;

// Selectors - use generic state type to avoid importing full store
type StateWithAdminPreferences = { adminPreferences: AdminPreferencesState };

export const selectServerOverride = (state: StateWithAdminPreferences) => 
    state.adminPreferences.serverOverride;

export const selectEffectiveServer = (state: StateWithAdminPreferences): ServerEnvironment => 
    state.adminPreferences.serverOverride || 'production';

export const selectIsUsingLocalhost = (state: StateWithAdminPreferences): boolean =>
    state.adminPreferences.serverOverride === 'localhost';
