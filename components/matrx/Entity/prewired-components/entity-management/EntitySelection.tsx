import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {useAppSelector} from '@/lib/redux/hooks';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {EntityKeys} from '@/types/entityTypes';
import {cn} from "@heroui/react";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";

type LayoutType = 'stacked' | 'sideBySide';

interface EntitySelectionProps {
    selectedEntity?: EntityKeys | null;
    onEntityChange?: (value: EntityKeys) => void;
    layout?: LayoutType;
    selectHeight?: number;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    className?: string;
}

const EntitySelection: React.FC<EntitySelectionProps> = (
    {
        selectedEntity,
        onEntityChange,
        layout,
        selectHeight,
        className
    }) => {
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);
    
    return (
        <div className={cn("flex justify-center w-full p-2 pt-3 overflow-hidden", className)}>
            <div className="w-full max-w-full">
                <Select
                    value={selectedEntity || undefined}
                    onValueChange={(value) => onEntityChange(value as EntityKeys)}
                >
                    <SelectTrigger className="w-full bg-card text-card-foreground border-matrxBorder overflow-hidden">
                        <SelectValue
                            placeholder={
                                <span className="text-sm truncate">
                                    {selectedEntity
                                     ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                                     : 'Select Entity...'}
                                </span>
                            }
                        />
                    </SelectTrigger>
                    <SelectContent
                        position={layout === 'sideBySide' ? 'popper' : 'item-aligned'}
                        className="bg-card max-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] overflow-hidden"
                        align="center"
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={true}
                    >
                        {entitySelectOptions.map(({value, label}) => (
                            <SelectItem
                                key={value}
                                value={value}
                                className="bg-card text-card-foreground hover:bg-muted truncate pr-2 overflow-hidden"
                            >
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default EntitySelection;