import type {ClassValue} from "clsx";
import clsx from "clsx";
import {extendTailwindMerge} from "tailwind-merge";

// Define common configuration types
type Density = 'compact' | 'normal' | 'comfortable';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'success' | 'outline' | 'ghost' | 'link';
type InteractionLevel = 'none' | 'subtle' | 'medium' | 'high';

// Configuration for different density levels
const densityConfig = {
    compact: {
        padding: {x: 'px-2', y: 'py-1'},
        spacing: 'gap-1',
        text: 'text-sm',
        height: 'h-8'
    },
    normal: {
        padding: {x: 'px-3', y: 'py-2'},
        spacing: 'gap-2',
        text: 'text-base',
        height: 'h-10'
    },
    comfortable: {
        padding: {x: 'px-4', y: 'py-3'},
        spacing: 'gap-3',
        text: 'text-lg',
        height: 'h-12'
    }
};

// Configuration for different variants
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

// Configuration for interaction levels
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

// Extended configuration for the tailwind-merge utility
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [{text: ['xs', 'sm', 'base', 'lg', 'xl', '2xs']}],
            'gap': [{gap: ['1', '2', '3']}], // Replace 'spacing' with 'gap'
            'px': [{px: ['2', '3', '4']}],   // Split padding into px and py
            'py': [{py: ['1', '2', '3']}],
            'h': [{h: ['8', '10', '12']}],   // Define height values explicitly
        },
    },
});


interface StyleOptions {
    density?: Density;
    variant?: Variant;
    interactionLevel?: InteractionLevel;
    disabled?: boolean;
    className?: string;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getDynamicStyles(
    {
        density = 'normal',
        variant = 'default',
        interactionLevel = 'medium',
        disabled = false,
        className = ''
    }: StyleOptions = {}) {
    const densityClasses = densityConfig[density];
    const variantClasses = variantConfig[variant];
    const interactionClasses = interactionConfig[interactionLevel];

    const baseClasses = cn(
        // Density-based classes
        densityClasses.padding.x,
        densityClasses.padding.y,
        densityClasses.spacing,
        densityClasses.text,
        densityClasses.height,

        // Variant classes
        variantClasses,

        // Interaction classes (only if not disabled)
        !disabled && [
            interactionClasses.hover,
            interactionClasses.active,
            interactionClasses.focus,
        ],

        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',

        // Custom classes
        className
    );

    return baseClasses;
}
