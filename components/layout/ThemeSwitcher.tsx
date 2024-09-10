// components/ThemeSwitcher.tsx
'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming this is a reusable button component
import { useTheme } from '@/components/layout/ThemeProvider';
import clsx from 'clsx';

interface ThemeSwitcherProps {
    className?: string; // Allow additional className for customization
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={clsx("h-8 w-8 px-0", className)}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-[--foreground]" />
            ) : (
                <Moon className="h-4 w-4 text-[--foreground]" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
};
