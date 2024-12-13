import React from 'react';
import {cn} from '@/lib/utils';

interface LoadingButtonGroupProps {
    children: React.ReactNode;
    className?: string;
    pairGap?: number;
    buttonGap?: number;
}

const LoadingButtonGroupPairs = (
    {
        children,
        className,
        pairGap = 4,
        buttonGap = 4,
    }: LoadingButtonGroupProps) => {
    const childrenArray = React.Children.toArray(children);
    const pairs = Array.from(
        {length: Math.ceil(childrenArray.length / 2)},
        (_, index) => childrenArray.slice(index * 2, index * 2 + 2)
    );

    return (
        <div className={cn('flex flex-wrap items-center', `gap-${pairGap}`, className)}>
            {pairs.map((pair, index) => (
                <div key={`pair-${index}`} className={cn('flex items-center', `gap-${buttonGap}`)}>
                    {pair}
                </div>
            ))}
        </div>
    );
};

export default LoadingButtonGroupPairs;
