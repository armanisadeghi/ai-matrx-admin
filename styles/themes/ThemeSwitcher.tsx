// File: components/ThemeSwitcher.tsx
'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/styles/themes/ThemeProvider';
import clsx from 'clsx';
import { useEffect } from 'react';

interface ThemeSwitcherProps {
    className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className }) => {
    const { mode, toggleMode } = useTheme();

    useEffect(() => {
        document.cookie = `theme=${mode};path=/`;
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            className={clsx("h-8 w-8 px-0", className)}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {mode === 'dark' ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
};
