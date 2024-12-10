import React from 'react';
import {MatrxVariant} from '../types';
import {ComponentSize} from '@/types/componentConfigTypes';
import {Loader2} from 'lucide-react';

interface BorderMagicButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: MatrxVariant;
    size?: ComponentSize | 'icon';
    animate?: boolean;
    className?: string;
    speed?: 'slow' | 'normal' | 'fast';
    loader?: boolean;
}

const BorderMagicButton = (
    {
        children,
        variant = 'default',
        size = 'default',
        animate = true,
        speed = 'normal',
        loader = false,
        className = '',
        onClick,
        disabled,
        ...props
    }: BorderMagicButtonProps) => {

    const isAnimated = loader ? true : animate;
    const animationSpeed = loader ? 'fast' : speed;

    const getAnimationSpeed = (speed: 'slow' | 'normal' | 'fast') => {
        switch (speed) {
            case 'slow':
                return 'animate-[spin_3s_linear_infinite]';
            case 'fast':
                return 'animate-[spin_1s_linear_infinite]';
            default:
                return 'animate-[spin_2s_linear_infinite]';
        }
    };

    const getSizeClasses = (size: ComponentSize | 'icon') => {
        switch (size) {
            case 'xs':
                return 'h-8 text-xs';
            case 'sm':
                return 'h-10 text-sm';
            case 'md':
                return 'h-12 text-base';
            case 'lg':
                return 'h-14 text-lg';
            case 'xl':
                return 'h-16 text-xl';
            case 'icon':
                return 'h-10 w-10';
            default:
                return 'h-12 text-sm';
        }
    };

    const getVariantClasses = (variant: MatrxVariant) => {
        switch (variant) {
            case 'destructive':
                return 'focus:ring-red-400';
            case 'success':
                return 'focus:ring-green-400';
            case 'outline':
                return 'focus:ring-slate-400';
            case 'secondary':
                return 'focus:ring-slate-400';
            case 'ghost':
                return 'focus:ring-slate-400';
            case 'link':
                return 'focus:ring-slate-400';
            case 'primary':
                return 'focus:ring-blue-400';
            default:
                return 'focus:ring-slate-400';
        }
    };

    const getPaddingClasses = (size: ComponentSize | 'icon') => {
        return size === 'icon' ? 'p-0' : 'px-3 py-1';
    };

    return (
        <button
            disabled={loader || disabled}
            className={`
                relative 
                inline-flex 
                overflow-hidden 
                rounded-full 
                p-[1px] 
                focus:outline-none 
                focus:ring-2 
                focus:ring-offset-2 
                focus:ring-offset-slate-50
                ${getSizeClasses(size)}
                ${getVariantClasses(variant)}
                ${className}
                ${loader ? 'cursor-wait' : ''}
                transition-all
                duration-200
            `}
            onClick={onClick}
            {...props}
        >
            {/* Background spinning animation */}
            <span
                className={`
                    absolute 
                    inset-[-1000%] 
                    ${isAnimated ? getAnimationSpeed(animationSpeed) : ''}
                    bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]
                `}
            />

            {/* Button face with shimmer effect */}
            <span
                className={`
                    relative
                    inline-flex 
                    h-full 
                    w-full 
                    items-center 
                    justify-center 
                    rounded-full 
                    font-medium 
                    text-white 
                    gap-2
                    ${getPaddingClasses(size)}
                    ${loader
                      ? 'bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] animate-shimmer'
                      : 'bg-slate-950'
                }
                `}
            >
                {loader && <Loader2 className="h-4 w-4 animate-spin" />}
                {children}
            </span>
        </button>
    );
};

export default BorderMagicButton;
