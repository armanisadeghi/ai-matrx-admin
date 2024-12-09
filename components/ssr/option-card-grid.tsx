// components/OptionCard/OptionCardGrid.tsx
import React from 'react';
import { OptionCard } from './option-cards';
import { OptionCardData } from './types';

interface OptionCardGridProps {
    items: OptionCardData[];
    basePath: string;
}

export const OptionCardGrid = ({ items, basePath }: OptionCardGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
                <OptionCard key={item.id} data={item} basePath={basePath} />
            ))}
        </div>
    );
};
