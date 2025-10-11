'use client';

import React from 'react';
import { useTheme } from '@/styles/themes/ThemeProvider';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface ThemeSwitcherProps {
    className?: string;
    open: boolean;
    darkModeText?: string;
    lightModeText?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
    className, 
    open = false,
    darkModeText = 'Switch to light mode',
    lightModeText = 'Switch to dark mode'
}) => {
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

    const label = mode === 'dark' ? darkModeText : lightModeText;

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "group/sidebar flex w-full items-center rounded-sm hover:bg-neutral-100 dark:hover:bg-neutral-700",
                open ? "justify-start gap-2 px-2 py-2" : "justify-center px-1 py-1.5",
                className,
            )}
        >
            {icon}

            <motion.span
                initial={{
                    display: "none",
                    opacity: 0,
                }}
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-xs text-neutral-700 transition duration-150 dark:text-neutral-200"
            >
                {label}
            </motion.span>
        </button>
    );
};


interface ThemeSwitcherIconProps {
    className?: string;
  }
  
  export const ThemeSwitcherIcon: React.FC<ThemeSwitcherIconProps> = ({ className }) => {
    const { mode, toggleMode } = useTheme();
  
    React.useEffect(() => {
      document.cookie = `theme=${mode};path=/`;
      document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);
  
    return (
      <button
        onClick={toggleMode}
        className={cn(
          "flex items-center justify-center rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700",
          className
        )}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {mode === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    );
  };
  
interface ThemeSwitcherMinimalProps {
  className?: string;
  text?: string;
}

export const ThemeSwitcherMinimal: React.FC<ThemeSwitcherMinimalProps> = ({ 
  className,
  text
}) => {
  const { mode, toggleMode } = useTheme();
  
  React.useEffect(() => {
    document.cookie = `theme=${mode};path=/`;
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);
  
  const displayText = text || (mode === 'dark' ? 'Light mode' : 'Dark mode');
  
  return (
    <button
      onClick={toggleMode}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        className
      )}
    >
      <span>{displayText}</span>
      {mode === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
};
  