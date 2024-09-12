import React from 'react';
import { useTheme } from './ThemeContext';
import { ThemeName } from './theme.types';

const ThemeSwitcher: React.FC = () => {
    const { themeName, setThemeName, isDarkMode, toggleDarkMode } = useTheme();

    const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setThemeName(event.target.value as ThemeName);
    };

    return (
        <div className="p-4 bg-background text-foreground">
            <select value={themeName} onChange={handleThemeChange} className="mr-4 p-2 bg-input text-foreground">
                <option value="default">Default</option>
                <option value="contrastRed">Contrast Red</option>
                <option value="contrastBlue">Contrast Blue</option>
                <option value="contrastGreen">Contrast Green</option>
                <option value="contrastViolet">Contrast Violet</option>
                <option value="contrastYellow">Contrast Yellow</option>
            </select>
            <button onClick={toggleDarkMode} className="p-2 bg-primary text-primary-foreground">
                {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
        </div>
    );
};

export default ThemeSwitcher;