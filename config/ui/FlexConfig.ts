// FlexConfig.ts
import {cn} from "@/utils/cn";
import {
    AnimationPreset, BaseMatrxProps,
    ComponentDensity,
    ComponentSize,
    TextareaSize
} from "@/types/componentConfigTypes";


interface DensityConfigType {
    padding: Record<ComponentSize, string>;
    spacing: string;
    fontSize: string;
    borderRadius: string;
    height: Record<ComponentSize, string>;
    gap: string;
}

export const densityConfig: Record<ComponentDensity, DensityConfigType> = {
    compact: {
        padding: {
            xs: 'px-1 py-0.5',
            sm: 'px-2 py-1',
            md: 'px-3 py-1.5',
            lg: 'px-4 py-2',
            xl: 'px-5 py-2.5'
        },
        spacing: 'space-y-2',
        fontSize: 'text-sm',
        borderRadius: 'rounded',
        height: {
            xs: 'h-6',
            sm: 'h-8',
            md: 'h-9',
            lg: 'h-10',
            xl: 'h-11'
        },
        gap: '2' // This represents a gap of 0.5rem (8px)
    },
    normal: {
        padding: {
            xs: 'px-2 py-1',
            sm: 'px-3 py-1.5',
            md: 'px-4 py-2',
            lg: 'px-5 py-2.5',
            xl: 'px-6 py-3'
        },
        spacing: 'space-y-4',
        fontSize: 'text-base',
        borderRadius: 'rounded-md',
        height: {
            xs: 'h-7',
            sm: 'h-9',
            md: 'h-10',
            lg: 'h-11',
            xl: 'h-12'
        },
        gap: '3' // This represents a gap of 0.75rem (12px)
    },
    comfortable: {
        padding: {
            xs: 'px-3 py-1.5',
            sm: 'px-4 py-2',
            md: 'px-5 py-2.5',
            lg: 'px-6 py-3',
            xl: 'px-7 py-3.5'
        },
        spacing: 'space-y-6',
        fontSize: 'text-lg',
        borderRadius: 'rounded-lg',
        height: {
            xs: 'h-8',
            sm: 'h-10',
            md: 'h-11',
            lg: 'h-12',
            xl: 'h-14'
        },
        gap: '4' // This represents a gap of 1rem (16px)
    }
};

export const animationPresets: Record<AnimationPreset, {
    initial: any;
    animate: any;
    exit?: any;
    transition: any;
    hover?: any;
    tap?: any;
}> = {
    none: {
        initial: {},
        animate: {},
        transition: {}
    },
    subtle: {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -5 },
        transition: { duration: 0.2 },
        hover: { y: -2 },
        tap: { y: 0 }
    },
    smooth: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.3, ease: "easeOut" },
        hover: { scale: 1.02 },
        tap: { scale: 0.98 }
    },
    energetic: {
        initial: { opacity: 0, scale: 0.9, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: -10 },
        transition: { type: "spring", stiffness: 400, damping: 25 },
        hover: { scale: 1.05, y: -5 },
        tap: { scale: 0.95, y: 0 }
    },
    playful: {
        initial: { opacity: 0, rotate: -5, scale: 0.9 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 5, scale: 0.9 },
        transition: { type: "spring", stiffness: 300, damping: 20 },
        hover: { rotate: [-1, 1, -1], transition: { repeat: Infinity } },
        tap: { scale: 0.95, rotate: 0 }
    }
};

export const textareaSizeConfig: Record<TextareaSize, {
    minHeight: string;
    maxHeight?: string;
    fontSize: string;
    padding: string;
    defaultRows: number;
}> = {
    compact: {
        minHeight: 'min-h-[60px]',
        fontSize: 'text-sm',
        padding: 'p-2',
        defaultRows: 3
    },
    default: {
        minHeight: 'min-h-[120px]',
        fontSize: 'text-base',
        padding: 'p-3',
        defaultRows: 5
    },
    large: {
        minHeight: 'min-h-[200px]',
        maxHeight: 'max-h-[400px]',
        fontSize: 'text-base',
        padding: 'p-4',
        defaultRows: 8
    },
    article: {
        minHeight: 'min-h-[400px]',
        fontSize: 'text-base',
        padding: 'p-6',
        defaultRows: 20
    },
    custom: {
        minHeight: 'min-h-[120px]',
        fontSize: 'text-base',
        padding: 'p-3',
        defaultRows: 5
    }
};

export const jsonViewerConfig: Record<ComponentDensity, {
    arrayThreshold: number;
    truncateThreshold: number;
    indentSize: string;
    fontSize: Record<ComponentSize, string>;
    iconSize: Record<ComponentSize, string>;
    spacing: string;
    itemPadding: string;
    contentPadding: string;
}> = {
    compact: {
        arrayThreshold: 3,
        truncateThreshold: 3,
        indentSize: 'pl-2',
        fontSize: {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-sm',
            lg: 'text-base',
            xl: 'text-lg'
        },
        iconSize: {
            xs: 'h-3 w-3',
            sm: 'h-3.5 w-3.5',
            md: 'h-4 w-4',
            lg: 'h-5 w-5',
            xl: 'h-6 w-6'
        },
        spacing: 'gap-1',
        itemPadding: 'py-0.5 px-1',
        contentPadding: 'p-1'
    },
    normal: {
        arrayThreshold: 4,
        truncateThreshold: 4,
        indentSize: 'pl-3',
        fontSize: {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-sm',
            lg: 'text-base',
            xl: 'text-lg'
        },
        iconSize: {
            xs: 'h-3 w-3',
            sm: 'h-3.5 w-3.5',
            md: 'h-4 w-4',
            lg: 'h-5 w-5',
            xl: 'h-6 w-6'
        },
        spacing: 'space-y-1',
        itemPadding: 'py-1 px-2',
        contentPadding: 'p-3'
    },
    comfortable: {
        arrayThreshold: 5,
        truncateThreshold: 5,
        indentSize: 'pl-2',
        fontSize: {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-sm',
            lg: 'text-base',
            xl: 'text-lg'
        },
        iconSize: {
            xs: 'h-3 w-3',
            sm: 'h-3.5 w-3.5',
            md: 'h-4 w-4',
            lg: 'h-5 w-5',
            xl: 'h-6 w-6'
        },
        spacing: 'space-y-2',
        itemPadding: 'py-1.5 px-3',
        contentPadding: 'p-1'
    }
};

// Helper Functions
export const getComponentStyles = (props: Partial<BaseMatrxProps> & { component?: 'json' }) => {
    const {
        size = 'md',
        density = 'normal',
        variant = 'default',
        state = 'idle',
        disabled,
        error,
        component
    } = props;

    const densityStyles = densityConfig[density];
    const isInvalid = state === 'error' || Boolean(error);

    if (component === 'json') {
        return cn(
            // Base styles without flex
            'transition-all duration-200',
            // Size and density without height constraints
            densityStyles.fontSize,
            densityStyles.borderRadius,
            // State styles
            state === 'loading' && 'opacity-80 cursor-wait',
            state === 'success' && 'bg-success text-success-foreground',
            state === 'error' && 'bg-destructive text-destructive-foreground',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        );
    }

    return cn(
        // Base styles
        'relative inline-flex items-center justify-center',
        'transition-all duration-200',

        // Size and density
        densityStyles.padding[size],
        densityStyles.fontSize,
        densityStyles.borderRadius,
        densityStyles.height[size],

        // Variant styles (compatible with shadcn patterns)
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'link' && 'text-primary underline-offset-4 hover:underline',

        // State styles
        state === 'loading' && 'opacity-80 cursor-wait',
        state === 'success' && [
            'border-success',
            'focus:border-success',
            'focus:ring-success'
        ],
        isInvalid && [
            'border-destructive',
            'focus:border-destructive',
            'focus:ring-destructive'
        ],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',

        // Input-specific styles
        'border',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isInvalid && 'placeholder:text-destructive/50'
    );
};

// Animation Hook
export const useComponentAnimation = (preset: AnimationPreset = 'subtle', disabled: boolean = false) => {
    if (disabled) return {};

    const animation = animationPresets[preset];

    return {
        initial: animation.initial,
        animate: animation.animate,
        exit: animation.exit,
        transition: animation.transition,
        whileHover: animation.hover,
        whileTap: animation.tap
    };
};
