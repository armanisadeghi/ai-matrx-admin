import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { cn } from "@/styles/themes/utils";
import { 
  atomOneDarkReasonable, 
  atomOneDark, 
  atomOneLight 
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { CODE_THEMES } from './themes';

const ThemeSelector = ({ onThemeChange, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(isDark ? 'atomOneDarkReasonable' : 'atomOneLight');
  const [loading, setLoading] = useState(false);

  const themes = CODE_THEMES;

  // Set initial theme on mount and when isDark changes
  useEffect(() => {
    handleThemeSelect(isDark ? 'atomOneDarkReasonable' : 'atomOneLight');
  }, [isDark]);

  const handleThemeSelect = async (themeId) => {
    setSelectedTheme(themeId);
    setLoading(true);
    try {
      const styles = await import('react-syntax-highlighter/dist/esm/styles/hljs');
      const loadedTheme = styles[themeId];
      if (loadedTheme) {
        onThemeChange?.(loadedTheme);
      } else {
        console.error(`Theme ${themeId} not found in styles`);
      }
    } catch (error) {
      console.error(`Error loading theme ${themeId}:`, error);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.theme-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative theme-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
          "hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
          "relative",
          (isOpen || loading) && "bg-neutral-200 dark:bg-neutral-700"
        )}
        title="Change syntax theme"
        disabled={loading}
      >
        <Palette size={16} className={loading ? "animate-spin" : ""} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute right-0 mt-1 w-56 max-h-[60vh] overflow-y-auto",
          "bg-white dark:bg-neutral-800",
          "border border-neutral-200 dark:border-neutral-700",
          "rounded-md shadow-lg z-50",
          "divide-y divide-neutral-200 dark:divide-neutral-700"
        )}>
          <div className="py-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                  "text-neutral-700 dark:text-neutral-300",
                  selectedTheme === theme.id && "bg-neutral-100 dark:bg-neutral-700"
                )}
                disabled={loading}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;