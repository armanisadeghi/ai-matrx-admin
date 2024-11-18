import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from '@/lib/redux/hooks';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';
import { EntityKeys } from '@/types/entityTypes';
import { cn } from '@nextui-org/react';
import { AnimationPreset, ComponentDensity } from "@/types/componentConfigTypes";

type LayoutType = 'stacked' | 'sideBySide';

interface EntitySelectionProps {
    selectedEntity: EntityKeys | null;
    onEntityChange: (value: EntityKeys) => void;
    layout: LayoutType;
    selectHeight: number;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
}

const EntitySelection: React.FC<EntitySelectionProps> = (
    {
        selectedEntity,
        onEntityChange,
        layout,
        selectHeight,
    }) => {
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    return (
        <Select
            value={selectedEntity || undefined}
            onValueChange={(value) => onEntityChange(value as EntityKeys)}
        >
            <SelectTrigger
                className={cn(
                    "w-full bg-card text-card-foreground border-matrxBorder",
                    "h-auto p-2 text-sm" // Adjust padding for compact design
                )}
            >
                <SelectValue placeholder={
                    <span className="text-sm">
                        {selectedEntity
                         ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                         : 'Select Entity...'}
                    </span>
                }/>
            </SelectTrigger>
            <SelectContent
                position={layout === 'sideBySide' ? 'popper' : 'item-aligned'}
                className={cn(
                    "bg-card max-h-[50vh] overflow-y-auto", // Max height for responsiveness
                    layout === 'sideBySide' && `max-h-[${selectHeight || 200}px]`
                )}
                sideOffset={0}
                align="start"
                side="bottom"
            >
                <div className="overflow-y-auto">
                    {entitySelectOptions.map(({ value, label }) => (
                        <SelectItem
                            key={value}
                            value={value}
                            className="bg-card text-card-foreground hover:bg-muted py-2 px-3 text-sm"
                        >
                            {label}
                        </SelectItem>
                    ))}
                </div>
            </SelectContent>
        </Select>
    );
};

export default EntitySelection;
