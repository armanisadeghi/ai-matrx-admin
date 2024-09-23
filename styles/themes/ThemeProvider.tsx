// File: styles/themes/ThemeProvider.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { RootState } from "@/lib/redux/store";
import { setMode } from './themeSlice';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextProps {
    mode: ThemeMode;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{
    children: React.ReactNode,
    defaultTheme?: ThemeMode,
    enableSystem?: boolean
}> = ({
          children,
          defaultTheme = 'dark',
          enableSystem = false
      }) => {
    const dispatch = useDispatch();
    const { mode } = useSelector((state: RootState) => state.theme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = document.cookie.split('; ').find(row => row.startsWith('theme='))?.split('=')[1] as ThemeMode | undefined;
        if (savedTheme) {
            dispatch(setMode(savedTheme));
        } else {
            dispatch(setMode(defaultTheme));
        }
    }, [dispatch, defaultTheme]);

    useEffect(() => {
        if (mounted) {
            document.cookie = `theme=${mode};path=/`;
            document.documentElement.setAttribute('data-theme', mode);
            document.documentElement.classList.toggle('dark', mode === 'dark');
        }
    }, [mode, mounted]);

    const toggleMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        dispatch(setMode(newMode));
    };

    const contextValue: ThemeContextProps = {
        mode,
        toggleMode
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            <NextThemesProvider
                attribute="class"
                defaultTheme={mode}
                enableSystem={enableSystem}
                value={{light: 'light', dark: 'dark'}}
            >
                {children}
            </NextThemesProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
