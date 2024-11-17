// components/MultiSelect.tsx
import React from 'react';
import {Checkbox} from '@/components/ui/checkbox';

interface MultiSelectProps<T> {
    items: T[];
    selectedItems: T[];
    onSelectionChange: (items: T[]) => void;
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string;
}

export function MultiSelect<T>(
    {
        items,
        selectedItems,
        onSelectionChange,
        renderItem,
        keyExtractor
    }: MultiSelectProps<T>) {
    const handleToggle = (item: T) => {
        const itemKey = keyExtractor(item);
        const isSelected = selectedItems.some(
            selected => keyExtractor(selected) === itemKey
        );

        if (isSelected) {
            onSelectionChange(
                selectedItems.filter(
                    selected => keyExtractor(selected) !== itemKey
                )
            );
        } else {
            onSelectionChange([...selectedItems, item]);
        }
    };

    return (
        <div className="space-y-2">
            {items.map(item => (
                <div
                    key={keyExtractor(item)}
                    className="flex items-center space-x-2"
                >
                    <Checkbox
                        checked={selectedItems.some(
                            selected => keyExtractor(selected) === keyExtractor(item)
                        )}
                        onCheckedChange={() => handleToggle(item)}
                    />
                    <div onClick={() => handleToggle(item)} className="cursor-pointer">
                        {renderItem(item)}
                    </div>
                </div>
            ))}
        </div>
    );
}
