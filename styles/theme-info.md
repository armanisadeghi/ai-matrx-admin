```
/
├── /app
│   ├── /(authenticated)
│   ├── /(public)
│   ├── /api
│   ├── /auth
│   ├── layout.tsx
│   ├── hold-hold-page.tsx  
│   └── Providers.tsx
├── /components
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── /styles
    ├── globals.css
    └── /themes
        ├── index.ts
        ├── flashcards.types.ts
        ├── themeDefinitions.ts
        ├── ThemeProvider.tsx
        ├── themeSlice.ts
        ├── ThemeSwitcher.tsx
        ├── fonts.ts
        └── utils.ts

File Descriptions:

1. `/styles/globals.css`: Global styles and Tailwind directives
2. `/tailwind.config.ts`: Tailwind configuration (in root directory)
3. `/styles/themes/index.ts`: Central export point for all theme-related modules
4. `/styles/themes/flashcards.types.ts`: TypeScript types for themes
5. `/styles/themes/themeDefinitions.ts`: Define all themes and their properties (colors, typography, etc.)
6. `/styles/themes/ThemeProvider.tsx`: React context provider for themes
7. `/styles/themes/themeSlice.ts`: Redux slice for theme state management
8. `/styles/themes/ThemeSwitcher.tsx`: Component for switching themes
9. `/styles/themes/fonts.ts`: Font definitions and imports
10. `/styles/themes/utils.ts`: Utility functions related to theming (like `cn`)
11. `/app/Providers.tsx`: React component wrapping the application with necessary providers
12. `/next.config.js`: Next.js configuration file (in root directory)
13. `/tsconfig.json`: TypeScript configuration file (in root directory)
```

Let's update the content of these files:

1. `styles/themes/index.ts`:

```typescript
export * from './types';
export * from './themeDefinitions';
export * from './ThemeProvider';
export { default as themeReducer } from './themeSlice';
export * from "./ThemeSwitcher";
export { setTheme, toggleMode, setMode } from './themeSlice';
export * from './fonts';
export { cn } from './color-utils';
```

2. `styles/themes/themeDefinitions.ts`:

```typescript
import { Theme, ThemeColor } from './types';

const createThemeColor = (light: string, dark: string): ThemeColor => ({light, dark});

const createTheme = (name: string, colors: Partial<Theme['colors']>): Theme => ({
    name,
    colors: {
        background: createThemeColor('#f5f5f5', '#020202'),
        // ... (all other color definitions)
        ...colors,
    },
    typography: {
        fontFamily: {
            sans: 'Inter, sans-serif',
            heading: 'Montserrat, sans-serif',
        },
        fontSize: {
            xs: '0.75rem',
            // ... (all font size definitions)
        },
        fontWeight: {
            light: '300',
            // ... (all font weight definitions)
        },
    },
});

export const defaultTheme = createTheme('Default', {});
export const contrastRedTheme = createTheme('Contrast Red', {
    // ... (theme-specific color overrides)
});

// ... (other theme definitions)

export const themes: Theme[] = [
    defaultTheme,
    contrastRedTheme,
    // ... (other themes)
];
```

3. Update `styles/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";
import { defaultTheme } from './themes/themeDefinitions';
import defaultTailwindTheme from 'tailwindcss/defaultTheme';
import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette';

const config: Config = {
    // ... (keep existing configuration)
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--typography-fontFamily-sans)", ...defaultTailwindTheme.fontFamily.sans],
                heading: ["var(--typography-fontFamily-heading)", ...defaultTailwindTheme.fontFamily.sans],
            },
            colors: {
                // ... (keep existing color definitions)
            },
            // ... (keep other extensions)
        },
    },
    // ... (keep plugins and other configurations)
};

function addVariablesForColors({ addBase, theme }: any) {
    // ... (keep existing function implementation)
}

export default config;
```
