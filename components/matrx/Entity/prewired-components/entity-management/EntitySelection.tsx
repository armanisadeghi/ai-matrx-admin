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
import {cn} from '@nextui-org/react';
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";

type LayoutType = 'stacked' | 'sideBySide';

interface EntitySelectionProps {
    selectedEntity: EntityKeys | null;
    onEntityChange: (value: EntityKeys) => void;
    layout: LayoutType;
    selectHeight: number;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    className?: string; // Added to allow parent control of outer spacing
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
        <div className={cn(
            "flex items-center justify-center w-full", // Centers the select both horizontally and vertically
            className
        )}>
            <Select
                value={selectedEntity || undefined}
                onValueChange={(value) => onEntityChange(value as EntityKeys)}
            >
                <SelectTrigger
                    className={cn(
                        "w-full bg-card text-card-foreground border-matrxBorder",
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
                        "bg-card overflow-y-auto",
                    )}
                    align="start"
                    side="bottom"
                >
                    {entitySelectOptions.map(({value, label}) => (
                        <SelectItem
                            key={value}
                            value={value}
                            className={cn(
                                "bg-card text-card-foreground hover:bg-muted",
                            )}
                        >
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default EntitySelection;
