// File: styles/themes/ThemeProvider.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from "@/lib/redux/store";
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
          defaultTheme,
          enableSystem = false
      }) => {
    const dispatch = useDispatch();
    const { mode } = useSelector((state: RootState) => state.theme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.debug(`⚡ThemeProvider mounted at ${performance.now().toFixed(2)}ms since page start`);
    }, []);

    useEffect(() => {
        setMounted(true);
        const savedTheme = document.cookie.split('; ').find(row => row.startsWith('theme='))?.split('=')[1] as ThemeMode | undefined;
        if (savedTheme) {
            dispatch(setMode(savedTheme));
        } else if (defaultTheme) {
            dispatch(setMode(defaultTheme));
        } else {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            dispatch(setMode(systemPrefersDark ? 'dark' : 'light'));
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
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        // Gracefully handle missing ThemeProvider (e.g., in public app context)
        // Return safe defaults instead of throwing
        console.warn('[useTheme] ThemeProvider not found, using default light mode');
        return {
            mode: 'light' as const,
            setMode: () => {},
            theme: {
                // Add basic theme defaults if needed
            }
        };
    }
    return context;
};
