'use client';

import React from 'react';
import { useTheme } from '@/styles/themes/ThemeProvider';
import { useSidebar } from '@/components/ui/sidebar-collapsible';
import { cn } from '@/lib/utils';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export const ThemeSwitcher = ({ className }: { className?: string }) => {
    const { mode, toggleMode } = useTheme();
    const { open } = useSidebar();

    React.useEffect(() => {
        document.cookie = `theme=${mode};path=/`;
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const icon = mode === 'dark' ? (
        <Sun className="h-5 w-5 text-foreground" />
    ) : (
        <Moon className="h-5 w-5 text-foreground" />
    );

    const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "group/sidebar flex items-center justify-start gap-2 rounded-sm px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700",
                className,
            )}
        >
            {icon}

            <motion.span
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-sm text-neutral-700 transition duration-150 dark:text-neutral-200"
            >
                {label}
            </motion.span>
        </button>
    );
};
