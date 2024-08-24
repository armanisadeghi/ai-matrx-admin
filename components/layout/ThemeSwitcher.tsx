// components/ThemeSwitcher.tsx
'use client';

import React from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-primary text-primary-foreground"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
};





// // components/ThemeSwitcher.tsx
// import React from 'react';
// import { useTheme } from './ThemeProvider';
// import { Moon, Sun } from 'lucide-react';
//
// export const ThemeSwitcher: React.FC = () => {
//     const { theme, toggleTheme } = useTheme();
//
//     return (
//         <button
//             onClick={toggleTheme}
//             className="p-2 rounded-full bg-primary text-primary-foreground"
//             aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
//         >
//             {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
//         </button>
//     );
// };
