import React, { createContext, useState, useEffect, useContext } from 'react';
import { Theme, ThemeName, ThemeColors } from './theme.types';
import { themes } from './themes';

interface ThemeContextType {
    themeName: ThemeName;
    setThemeName: (name: ThemeName) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeName, setThemeName] = useState<ThemeName>('default');
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    useEffect(() => {
        const theme: Theme = themes[themeName];
        const colors: ThemeColors = isDarkMode ? theme.dark : theme.light;

        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });

        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [themeName, isDarkMode]);

    return (
        <ThemeContext.Provider value={{ themeName, setThemeName, isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};