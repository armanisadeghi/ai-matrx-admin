'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/layout/ThemeProvider';

export function ModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 px-0">
        {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
        ) : (
            <Moon className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
  );
}
