'use client';

import React, {useState} from 'react';
import {X} from 'lucide-react';
import {cn} from "@/utils/cn";
import {MatrxVariant, EntityField} from "./types";

type AnimationPreset = 'none' | 'fade' | 'slide' | 'bounce';
type ChipVariants = MatrxVariant | 'warning' | 'danger' | 'purple' | 'pink' | 'indigo' | 'teal' | 'orange';

interface ChipFieldProps {
    field: EntityField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: AnimationPreset;
    variant?: ChipVariants;
    label?: string;
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    onRemove?: (() => void) | null;
    gradient?: boolean;
    icon?: React.ComponentType<any>;
    animated?: boolean;
    glow?: boolean;
    children?: React.ReactNode;
}

const baseStyles = "inline-flex items-center rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transform hover:-translate-y-0.5 shadow-lg active:translate-y-0";

const variants = {
    default: "bg-background text-foreground border-border",
    primary: "bg-primary text-primary-foreground border-primary-foreground/20",
    secondary: "bg-secondary text-secondary-foreground border-secondary-foreground/20",
    destructive: "bg-destructive text-destructive-foreground border-destructive-foreground/20",
    success: "bg-green-500 dark:bg-green-600 text-white border-green-700 dark:border-green-800",
    outline: "border-2 border-border bg-background text-foreground",
    ghost: "bg-background/50 text-foreground hover:bg-muted",
    link: "text-primary underline-offset-4 hover:underline",
    // Extended variants
    warning: "bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-700 dark:border-yellow-800",
    info: "bg-blue-500 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-800",
    purple: "bg-purple-500 dark:bg-purple-600 text-white border-purple-700 dark:border-purple-800",
    pink: "bg-pink-500 dark:bg-pink-600 text-white border-pink-700 dark:border-pink-800",
    indigo: "bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-700 dark:border-indigo-800",
    teal: "bg-teal-500 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-800",
    orange: "bg-orange-500 dark:bg-orange-600 text-white border-orange-700 dark:border-orange-800"
};

const gradientVariants = {
    default: "bg-gradient-to-r from-background via-muted to-background text-foreground",
    primary: "bg-gradient-to-r from-primary via-primary/80 to-primary text-primary-foreground",
    secondary: "bg-gradient-to-r from-secondary via-secondary/80 to-secondary text-secondary-foreground",
    destructive: "bg-gradient-to-r from-destructive via-destructive/80 to-destructive text-destructive-foreground",
    success: "bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white",
    outline: "bg-gradient-to-r from-background via-muted to-background text-foreground border-2",
    ghost: "bg-gradient-to-r from-background/50 via-muted/50 to-background/50 text-foreground",
    link: "bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 text-primary",
    // Extended gradient variants
    warning: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white",
    info: "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white",
    purple: "bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-white",
    pink: "bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600 text-white",
    indigo: "bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 text-white",
    teal: "bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 text-white",
    orange: "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white"
};

const sizes = {
    xs: "px-1.5 py-0.5 text-xs",
    sm: "px-2 py-0.5 text-sm",
    default: "px-3 py-1 text-base",
    md: "px-3 py-1 text-base",
    lg: "px-4 py-2 text-lg",
    xl: "px-5 py-2.5 text-xl",
    "2xl": "px-6 py-3 text-2xl",
    "3xl": "px-7 py-3.5 text-3xl"
};

export const EntityChip = (
    {
        field,
        value,
        onChange,
        className,
        density = 'normal',
        animationPreset = 'none',
        variant = 'default',
        size = 'default',
        label,
        onRemove = null,
        gradient = false,
        icon: Icon,
        animated = false,
        glow = false,
        children,
    }: ChipFieldProps) => {
    const densityClasses = {
        compact: 'my-1',
        normal: 'my-2',
        comfortable: 'my-3'
    };

    const animationClasses = {
        none: '',
        fade: 'transition-opacity',
        slide: 'transition-transform',
        bounce: 'animate-bounce'
    };

    return (
        <div className={cn(densityClasses[density])}>
            {label && (
                <label className="block text-sm font-medium text-foreground mb-1">
                    {label}
                </label>
            )}
            <span className={cn(
                baseStyles,
                gradient ? gradientVariants[variant as keyof typeof gradientVariants]
                         : variants[variant as keyof typeof variants],
                sizes[size],
                animationClasses[animationPreset],
                glow && 'animate-glow',
                className
            )}>
                {Icon && <Icon className="w-4 h-4 mr-2"/>}
                {value || field?.value}
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="ml-2 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/20"
                    >
                        <X className="h-3 w-3"/>
                    </button>
                )}
            </span>
        </div>
    );
};


interface EnhancedChipFieldProps extends ChipFieldProps {
    icon?: React.ComponentType<any>;
    animated?: boolean;
    glow?: boolean;
    onHover?: (isHovered: boolean) => void;
}

export const EnhancedEntityChip = (
    {
        field,
        value,
        onChange,
        className,
        density = 'normal',
        animationPreset = 'none',
        variant = 'default',
        size = 'default',
        label,
        onRemove = null,
        gradient = false,
        icon: IconComponent,
        animated = false,
        glow = false,
        children,
    }: EnhancedChipFieldProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isRemoved, setIsRemoved] = useState(false);

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRemoved(true);
        setTimeout(() => {
            if (onRemove) onRemove();
        }, 300);
    };

    const baseStyles = cn(
        "inline-flex items-center rounded-full font-medium transition-all duration-300 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
        animated && "animate-pulse",
        isRemoved ? "opacity-0 scale-75" : "opacity-100 scale-100",
        isHovered ? "-translate-y-1 rotate-1" : "translate-y-0 rotate-0"
    );

    const variants = {
        default: "bg-background text-foreground border-b-4 border-border shadow-lg hover:shadow-xl shadow-background/50 dark:shadow-background/20",
        primary: "bg-primary text-primary-foreground border-b-4 border-primary-foreground/20 shadow-lg hover:shadow-xl shadow-primary/50",
        secondary: "bg-secondary text-secondary-foreground border-b-4 border-secondary-foreground/20 shadow-lg hover:shadow-xl shadow-secondary/50",
        destructive: "bg-destructive text-destructive-foreground border-b-4 border-destructive-foreground/20 shadow-lg hover:shadow-xl shadow-destructive/50",
        success: "bg-green-500 dark:bg-green-600 text-white border-b-4 border-green-700 dark:border-green-800 shadow-lg hover:shadow-xl shadow-green-500/50",
        outline: "bg-background text-foreground border-2 border-border shadow-lg hover:shadow-xl",
        ghost: "bg-background/50 text-foreground hover:bg-muted border-b-4 border-border/20",
        link: "text-primary underline-offset-4 hover:underline",
        // Extended variants with proper dark mode support
        warning: "bg-yellow-500 dark:bg-yellow-600 text-white border-b-4 border-yellow-700 dark:border-yellow-800 shadow-lg hover:shadow-xl shadow-yellow-500/50",
        info: "bg-blue-500 dark:bg-blue-600 text-white border-b-4 border-blue-700 dark:border-blue-800 shadow-lg hover:shadow-xl shadow-blue-500/50",
        purple: "bg-purple-500 dark:bg-purple-600 text-white border-b-4 border-purple-700 dark:border-purple-800 shadow-lg hover:shadow-xl shadow-purple-500/50",
        pink: "bg-pink-500 dark:bg-pink-600 text-white border-b-4 border-pink-700 dark:border-pink-800 shadow-lg hover:shadow-xl shadow-pink-500/50",
        indigo: "bg-indigo-500 dark:bg-indigo-600 text-white border-b-4 border-indigo-700 dark:border-indigo-800 shadow-lg hover:shadow-xl shadow-indigo-500/50",
        teal: "bg-teal-500 dark:bg-teal-600 text-white border-b-4 border-teal-700 dark:border-teal-800 shadow-lg hover:shadow-xl shadow-teal-500/50",
        orange: "bg-orange-500 dark:bg-orange-600 text-white border-b-4 border-orange-700 dark:border-orange-800 shadow-lg hover:shadow-xl shadow-orange-500/50"
    };

    const gradientVariants = {
        default: "bg-gradient-to-r from-background via-muted to-background text-foreground",
        primary: "bg-gradient-to-r from-primary via-primary/80 to-primary text-primary-foreground",
        secondary: "bg-gradient-to-r from-secondary via-secondary/80 to-secondary text-secondary-foreground",
        destructive: "bg-gradient-to-r from-destructive via-destructive/80 to-destructive text-destructive-foreground",
        success: "bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white",
        outline: "bg-gradient-to-r from-background via-muted to-background text-foreground border-2",
        ghost: "bg-gradient-to-r from-background/50 via-muted/50 to-background/50 text-foreground",
        link: "bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 text-primary",
        // Extended gradient variants
        warning: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white",
        info: "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white",
        purple: "bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-white",
        pink: "bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600 text-white",
        indigo: "bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 text-white",
        teal: "bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 text-white",
        orange: "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white"
    };

    const sizes = {
        xs: "px-1.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-sm",
        default: "px-3 py-1 text-base",
        md: "px-3 py-1 text-base",
        lg: "px-4 py-2 text-lg",
        xl: "px-5 py-2.5 text-xl",
        "2xl": "px-6 py-3 text-2xl",
        "3xl": "px-7 py-3.5 text-3xl"
    };

    const iconSizes = {
        xs: 12,
        sm: 14,
        default: 16,
        md: 16,
        lg: 20,
        xl: 24,
        "2xl": 28,
        "3xl": 32
    };
    const densityClasses = {
        compact: 'my-1',
        normal: 'my-2',
        comfortable: 'my-3'
    };


    const getGlowStyle = (variant: ChipVariants) => {
        if (!glow) return '';

        const glowColors = {
            default: 'var(--foreground)',
            primary: 'var(--primary)',
            secondary: 'var(--secondary)',
            destructive: 'var(--destructive)',
            success: 'rgb(34 197 94)',
            outline: 'var(--border)',
            ghost: 'var(--muted)',
            link: 'var(--primary)',
            warning: 'rgb(234 179 8)',
            info: 'rgb(59 130 246)',
            purple: 'rgb(168 85 247)',
            pink: 'rgb(236 72 153)',
            indigo: 'rgb(99 102 241)',
            teal: 'rgb(20 184 166)',
            orange: 'rgb(249 115 22)'
        };

        const glowIntensity = {
            default: '0.2',
            primary: '0.5',
            secondary: '0.4',
            destructive: '0.5',
            success: '0.5',
            outline: '0.3',
            ghost: '0.2',
            link: '0.4',
            warning: '0.5',
            info: '0.5',
            purple: '0.5',
            pink: '0.5',
            indigo: '0.5',
            teal: '0.5',
            orange: '0.5'
        };

        const color = glowColors[variant];
        const intensity = glowIntensity[variant];

        return {
            filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 12px ${color})`,
            '--glow-intensity': intensity,
            animation: 'glow 2s ease-in-out infinite alternate'
        };
    };

    const glowAnimation = glow ? {
        '@keyframes glow': {
            '0%': {
                filter: `drop-shadow(0 0 8px ${getGlowStyle(variant as ChipVariants)}) 
                        drop-shadow(0 0 12px ${getGlowStyle(variant as ChipVariants)})`
            },
            '100%': {
                filter: `drop-shadow(0 0 12px ${getGlowStyle(variant as ChipVariants)}) 
                        drop-shadow(0 0 20px ${getGlowStyle(variant as ChipVariants)})`
            }
        }
    } : {};

    return (
        <div className={cn(densityClasses[density])}>
            {label && (
                <label className="block text-sm font-medium text-foreground mb-1">
                    {label}
                </label>
            )}
            <span
                className={cn(
                    baseStyles,
                    gradient ? gradientVariants[variant as keyof typeof gradientVariants]
                             : variants[variant as keyof typeof variants],
                    sizes[size],
                    gradient && 'border-none',
                    glow && 'animate-glow',
                    className
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    ...getGlowStyle(variant as ChipVariants),
                    transition: 'all 0.3s ease-in-out',
                }}
            >
                {IconComponent && (
                    <span className="mr-1">
                        <IconComponent size={iconSizes[size]} />
                    </span>
                )}
                {value || field?.value || children}
                {onRemove && (
                    <button
                        onClick={handleRemove}
                        className="ml-2 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                    >
                        <X size={iconSizes[size]} />
                    </button>
                )}
            </span>
        </div>
    );
};
