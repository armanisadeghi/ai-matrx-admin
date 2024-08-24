// components/layout/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ContrastColor = 'standard' | 'red' | 'blue' | 'green' | 'violet' | 'yellow';

interface ThemeContextProps {
    theme: Theme;
    contrastColor: ContrastColor;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [contrastColor, setContrastColor] = useState<ContrastColor>('standard');

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    useEffect(() => {
        const fetchUserSettings = async () => {
            try {
                const response = await fetch('/api/user-settings');
                const settings = await response.json();

                if (settings.theme) {
                    setTheme(settings.theme);
                }
                if (settings.contrastColor) {
                    setContrastColor(settings.contrastColor);
                }
            } catch (error) {
                console.error('Failed to fetch user settings:', error);
            }
        };

        fetchUserSettings();
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.setAttribute('data-contrast', contrastColor);
    }, [theme, contrastColor]);

    return (
        <ThemeContext.Provider value={{ theme, contrastColor, toggleTheme }}>
            {children}
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



// TODO: after setting up Redux
//
// // components/ThemeProvider.tsx
// import { ReactNode, useEffect } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import { setTheme, setContrastColor } from '../store/slices/userSettingsSlice';
// import { RootState } from '../store'; // Assuming you have a store configured
//
// interface ThemeProviderProps {
//     children: ReactNode;
// }
//
// export const ThemeProvider = ({ children }: ThemeProviderProps) => {
//     const dispatch = useDispatch();
//     const { theme, contrastColor } = useSelector((state: RootState) => state.userSettings);
//
//     useEffect(() => {
//         // TODO: Initialize settings from cookies or local storage on mount
//         // This is a placeholder for the initialization logic
//         const initializeSettings = () => {
//             // Example: Reading from cookies
//             const savedTheme = document.cookie.replace(/(?:(?:^|.*;\s*)theme\s*\=\s*([^;]*).*$)|^.*$/, "$1");
//             if (savedTheme) {
//                 dispatch(setTheme(savedTheme as 'light' | 'dark'));
//             }
//             // Similar logic for contrastColor
//         };
//
//         initializeSettings();
//     }, [dispatch]);
//
//     useEffect(() => {
//         document.documentElement.classList.toggle('dark', theme === 'dark');
//         document.documentElement.setAttribute('data-contrast', contrastColor);
//
//         // TODO: Save to cookies
//         document.cookie = `theme=${theme}; path=/; max-age=31536000`; // 1 year expiry
//         // Similar logic for contrastColor
//     }, [theme, contrastColor]);
//
//     return <>{children}</>;
// };
//
// // Hook for accessing theme-related functions
// export const useTheme = () => {
//     const dispatch = useDispatch();
//     const { theme, contrastColor } = useSelector((state: RootState) => state.userSettings);
//
//     return {
//         theme,
//         contrastColor,
//         toggleTheme: () => dispatch(setTheme(theme === 'light' ? 'dark' : 'light')),
//         setContrastColor: (color: UserSettings['contrastColor']) => dispatch(setContrastColor(color)),
//     };
// };
