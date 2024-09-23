// File: styles/themes/themeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
    mode: ThemeMode;
}

const initialState: ThemeState = {
    mode: 'dark',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleMode: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
        },
        setMode: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
        },
    },
});

export const { toggleMode, setMode } = themeSlice.actions;
export default themeSlice.reducer;
