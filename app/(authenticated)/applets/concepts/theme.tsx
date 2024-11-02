// types/theme.ts
'use client';

export interface AppletTheme {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
        muted: string;
        border: string;
    };
    gradients?: {
        primary?: string;
        secondary?: string;
    };
    typography?: {
        fontFamily?: string;
        headingFamily?: string;
    };
}

// lib/theme/applets-themes.ts
export const defaultAppletThemes: Record<string, AppletTheme> = {
    blue: {
        id: 'blue',
        name: 'Ocean Blue',
        colors: {
            primary: '221 83% 53%',    // Tailwind blue-500
            secondary: '217 91% 60%',  // Tailwind blue-400
            accent: '199 89% 48%',     // Custom accent blue
            background: '214 32% 91%', // Light background
            foreground: '214 40% 16%', // Dark text
            muted: '214 32% 91%',      // Muted background
            border: '214 32% 91%',     // Border color
        }
    },
    green: {
        id: 'green',
        name: 'Forest Green',
        colors: {
            primary: '142 72% 29%',    // Tailwind green-700
            secondary: '142 71% 45%',  // Tailwind green-500
            accent: '142 76% 36%',     // Custom accent green
            background: '144 32% 95%', // Light background
            foreground: '144 40% 16%', // Dark text
            muted: '144 32% 91%',      // Muted background
            border: '144 32% 91%',     // Border color
        }
    },
    // Add more preset themes as needed
};

/*
// tailwind.config.ts update
import {Config} from 'tailwindcss';

const config: Config = {
    // ... your existing config
    theme: {
        extend: {
            // ... your existing extensions
            colors: {
                // ... your existing colors
                'applet': {
                    primary: 'hsl(var(--applets-primary) / <alpha-value>)',
                    secondary: 'hsl(var(--applets-secondary) / <alpha-value>)',
                    accent: 'hsl(var(--applets-accent) / <alpha-value>)',
                    background: 'hsl(var(--applets-background) / <alpha-value>)',
                    foreground: 'hsl(var(--applets-foreground) / <alpha-value>)',
                    muted: 'hsl(var(--applets-muted) / <alpha-value>)',
                    border: 'hsl(var(--applets-border) / <alpha-value>)',
                },
            },
        },
    },
};
*/

// styles/applets-theme.css
// .applets-theme-root {
    /* Default theme variables if none are provided */
/*
// styles/applets-theme.css
/* Base theme styles */


/*
.applets-theme-root {
    /!* Default theme variables if none are provided *!/
    --applets-primary: var(--primary);
    --applets-secondary: var(--secondary);
    --applets-accent: var(--accent);
    --applets-background: var(--background);
    --applets-foreground: var(--foreground);
    --applets-muted: var(--muted);
    --applets-border: var(--border);
}

/!* Dark mode overrides *!/
.dark .applets-theme-root {
    /!* Dark mode specific overrides *!/
    --applets-background: var(--dark-background);
    --applets-foreground: var(--dark-foreground);
}
*/




