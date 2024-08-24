// store/slices/userSettingsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserSettings {
    theme: 'light' | 'dark';
    contrastColor: 'standard' | 'red' | 'blue' | 'green' | 'violet' | 'yellow';
    // Add other user settings as needed
}

const initialState: UserSettings = {
    theme: 'light',
    contrastColor: 'standard',
    // Initialize other settings
};

const userSettingsSlice = createSlice({
    name: 'userSettings',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload;
            // TODO: Sync with cookies
        },
        setContrastColor: (state, action: PayloadAction<UserSettings['contrastColor']>) => {
            state.contrastColor = action.payload;
            // TODO: Sync with cookies
        },
        // Add other reducers as needed
    },
});

export const { setTheme, setContrastColor } = userSettingsSlice.actions;
export default userSettingsSlice.reducer;

// TODO: Add async thunk for initializing user settings from database
// TODO: Add async thunk for saving user settings to database
