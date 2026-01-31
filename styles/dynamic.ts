import type { ClassValue } from "clsx";
import clsx from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Define the global configuration type
export interface ThemeConfig {
    density: 'compact' | 'normal' | 'comfortable';
    variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success' | 'outline' | 'ghost' | 'link';
    interactionLevel: 'none' | 'subtle' | 'medium' | 'high';
    disabled?: boolean;
}

// Default configuration
const defaultConfig: ThemeConfig = {
    density: 'normal',
    variant: 'default',
    interactionLevel: 'medium',
    disabled: false
};

// Configuration maps
const densityConfig = {
    compact: {
        padding: { x: 'px-2', y: 'py-1' },
        spacing: 'gap-1',
        text: 'text-sm',
        height: 'h-8'
    },
    normal: {
        padding: { x: 'px-3', y: 'py-2' },
        spacing: 'gap-2',
        text: 'text-base',
        height: 'h-10'
    },
    comfortable: {
        padding: { x: 'px-4', y: 'py-3' },
        spacing: 'gap-3',
        text: 'text-lg',
        height: 'h-12'
    }
};

const variantConfig = {
    default: 'bg-background border-input hover:bg-accent/50',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-success text-success-foreground hover:bg-success/90',
    outline: 'border-2 hover:bg-accent/50',
    ghost: 'hover:bg-accent/50',
    link: 'text-primary underline-offset-4 hover:underline'
};

const interactionConfig = {
    none: {
        hover: '',
        active: '',
        focus: ''
    },
    subtle: {
        hover: 'hover:brightness-95',
        active: 'active:brightness-90',
        focus: 'focus:ring-1'
    },
    medium: {
        hover: 'hover:brightness-90 hover:scale-[0.98]',
        active: 'active:brightness-85 active:scale-[0.97]',
        focus: 'focus:ring-2'
    },
    high: {
        hover: 'hover:brightness-85 hover:scale-[0.97] hover:shadow-md',
        active: 'active:brightness-80 active:scale-[0.96]',
        focus: 'focus:ring-2 focus:ring-offset-2'
    }
};

// Global configuration store
let globalConfig = { ...defaultConfig };

// Function to set global configuration
export const setThemeConfig = (config: Partial<ThemeConfig>) => {
    globalConfig = { ...globalConfig, ...config };
};

// Extended tailwind-merge configuration
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [{ text: ['xs', 'sm', 'base', 'lg', 'xl', '2xs'] }],
            'gap': [{ gap: ['1', '2', '3'] }],
            'px': [{ px: ['2', '3', '4'] }],
            'py': [{ py: ['1', '2', '3'] }],
            'h': [{ h: ['8', '10', '12'] }],  // Using 'h' instead of 'height'
            'brightness': [{ brightness: ['80', '85', '90', '95'] }],
            'scale': [{ scale: ['[0.96]', '[0.97]', '[0.98]'] }],
            'bg-color': [  // Changed from 'backgroundColor' to 'bg-color'
                'bg-background',
                'bg-primary',
                'bg-secondary',
                'bg-destructive',
                'bg-success',
                { 'bg-accent': ['50'], 'bg-primary': ['90'], 'bg-secondary': ['80'], 'bg-destructive': ['90'], 'bg-success': ['90'] }
            ],
            'text-color': [  // Changed from 'textColor' to 'text-color'
                'text-primary-foreground',
                'text-secondary-foreground',
                'text-destructive-foreground',
                'text-success-foreground'
            ],
            'border-w': ['border', 'border-2'],  // Changed from 'borderWidth' to 'border-w'
            'border-color': ['border-input'],
            'ring-w': ['ring-1', 'ring-2'],  // Changed from 'ringWidth' to 'ring-w'
            'ring-offset-w': ['ring-offset-2'],
            'shadow': ['shadow-md'],
            'cursor': ['cursor-not-allowed'],
            'opacity': ['opacity-50'],
            // @ts-ignore - bg-opacity not a standard Tailwind class group, using custom config
            'bg-opacity': ['50', '80', '90'] as any,
            'underline-offset': ['underline-offset-4']
        },
    },
});

// Main cn function that applies both global config and local classes
export const cn = (...inputs: ClassValue[]) => {
    const { density, variant, interactionLevel, disabled } = globalConfig;

    // Get the configuration-based classes
    const configClasses = [
        // Density classes
        densityConfig[density].padding.x,
        densityConfig[density].padding.y,
        densityConfig[density].spacing,
        densityConfig[density].text,
        densityConfig[density].height,

        // Variant classes
        variantConfig[variant],

        // Interaction classes (only if not disabled)
        !disabled && [
            interactionConfig[interactionLevel].hover,
            interactionConfig[interactionLevel].active,
            interactionConfig[interactionLevel].focus,
        ],

        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
    ];

    // Combine configuration classes with provided inputs
    return twMerge(clsx(configClasses, ...inputs));
};
