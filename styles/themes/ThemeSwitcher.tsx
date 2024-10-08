'use client';

import React from 'react';
import { useTheme } from '@/styles/themes/ThemeProvider';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface ThemeSwitcherProps {
    className?: string;
    open: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className, open }) => {
    const { mode, toggleMode } = useTheme();

    React.useEffect(() => {
        document.cookie = `theme=${mode};path=/`;
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const icon = mode === 'dark' ? (
        <Sun className={cn(
            "h-7 w-7 flex-shrink-0 rounded-full",
            open ? "h-6 w-6" : "h-5 w-5",
        )} />
    ) : (
        <Moon className={cn(
            "h-7 w-7 flex-shrink-0 rounded-full",
            open ? "h-6 w-6" : "h-5 w-5",
        )} />
    );

    const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "group/sidebar flex w-full items-center justify-start gap-2 rounded-sm px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700",
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
