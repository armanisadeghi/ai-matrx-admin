'use client';

import React, {useState} from 'react';
import {Loader2, LucideIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'success' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
type ComponentSize = 'default' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'icon' | 'roundIcon';

const sizeToIconMap: Record<ComponentSize, number> = {
    'xs': 12,
    'sm': 14,
    'default': 16,
    'md': 18,
    'lg': 20,
    'xl': 22,
    '2xl': 24,
    '3xl': 28,
    'icon': 18,
    'roundIcon': 18
};

const sizeToTextMap: Record<ComponentSize, string> = {
    'xs': 'text-xs',
    'sm': 'text-sm',
    'default': 'text-base',
    'md': 'text-md',
    'lg': 'text-lg',
    'xl': 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    'icon': 'text-base',
    'roundIcon': 'text-base'
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ComponentSize;
    icon?: LucideIcon;
    loadingText?: string;
    isLoading?: boolean;
    onLoadingChange?: (isLoading: boolean) => void;
    spinnerClassName?: string;
    iconClassName?: string;
}

const LoadingButton = (
    {
        children,
        variant = 'default',
        size = 'default',
        icon: Icon,
        loadingText = 'Loading',
        isLoading: externalLoading,
        onLoadingChange,
        className,
        spinnerClassName,
        iconClassName,
        onClick,
        disabled,
        ...props
    }: LoadingButtonProps) => {
    const [internalLoading, setInternalLoading] = useState(false);
    const isLoading = externalLoading ?? internalLoading;

    const iconSize = sizeToIconMap[size];
    const textSize = sizeToTextMap[size];
    const isIconOnly = size === 'icon' || size === 'roundIcon';

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick || isLoading) return;

        setInternalLoading(true);
        onLoadingChange?.(true);

        try {
            await onClick(e);
        } finally {
            setInternalLoading(false);
            onLoadingChange?.(false);
        }
    };

    const renderChildren = () => {
        if (isIconOnly) {
            // For icon-only modes, find the first icon element in children
            const iconElement = React.Children.toArray(children).find(child =>
                React.isValidElement(child) &&
                typeof child.type !== 'string' // Excludes HTML elements like span, div, etc.
            );
            return iconElement || (Icon && <Icon className={cn(iconClassName)} size={iconSize} />);
        }

        return (
            <>
                {Icon && <Icon className={cn(iconClassName)} size={iconSize} />}
                {children}
            </>
        );
    };

    return (
        // @ts-ignore - ButtonVariant includes "success" but Button component doesn't support it
        <Button
            variant={variant}
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={cn(
                'flex items-center justify-center',
                {
                    'h-8 w-8 p-0': isIconOnly,
                    'rounded-full': size === 'roundIcon',
                    'gap-2': !isIconOnly,
                },
                textSize,
                className
            )}
            {...props}
        >
            {isLoading ? (
                <Loader2
                    className={cn('animate-spin', spinnerClassName)}
                    size={iconSize}
                />
            ) : renderChildren()}
        </Button>
    );
};

export default LoadingButton;
