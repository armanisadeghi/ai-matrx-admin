'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PublicHeaderThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div className="w-7 h-7" aria-hidden="true" />
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
                "w-7 h-7 p-0 rounded-full",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                "transition-all duration-200"
            )}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            ) : (
                <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            )}
        </Button>
    );
}

