// File: @/components/StandaloneThemeSwitcher.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

interface StandaloneThemeSwitcherProps {
    className?: string;
    initialTheme: 'light' | 'dark';
}

export const StandaloneThemeSwitcher: React.FC<StandaloneThemeSwitcherProps> = ({ className, initialTheme }) => {
    const [mode, setMode] = useState<'light' | 'dark'>(initialTheme);
    const router = useRouter();

    useEffect(() => {
        document.documentElement.classList.toggle('dark', mode === 'dark');
    }, [mode]);

    const toggleMode = async () => {
        const newMode = mode === 'dark' ? 'light' : 'dark';
        setMode(newMode);
        document.documentElement.classList.toggle('dark', newMode === 'dark');

        // Update the cookie server-side
        await fetch('/api/set-theme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme: newMode }),
        });

        // Refresh the current route to update server components
        router.refresh();
    };

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
