import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from './types';
import { themes } from './themeColors';

interface ThemeState {
    currentTheme: string;
    mode: ThemeMode;
}

const initialState: ThemeState = {
    currentTheme: themes[0].name,
    mode: 'light',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<string>) => {
            state.currentTheme = action.payload;
        },
        toggleMode: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
        },
        setMode: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
        },
    },
});

export const { setTheme, toggleMode, setMode } = themeSlice.actions;
export default themeSlice.reducer;
