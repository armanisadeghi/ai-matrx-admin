import React from 'react';
import {cn} from '@/lib/utils';

interface LoadingButtonGroupProps {
    children: React.ReactNode;
    className?: string;
    gap?: number;
}

const LoadingButtonGroup = (
    {
        children,
        className,
        gap = 4,
    }: LoadingButtonGroupProps) => {
    return (
        <div className={cn('flex flex-wrap items-center', `gap-${gap}`, className)}>
            {children}
        </div>
    );
};

export default LoadingButtonGroup;
