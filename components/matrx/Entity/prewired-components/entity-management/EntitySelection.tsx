import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {useAppSelector} from '@/lib/redux/hooks';
import {selectEntityPrettyName, selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {EntityKeys} from '@/types/entityTypes';
import {cn} from '@nextui-org/react';
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
        <div className="flex justify-center w-full p-2 pt-3">
            <div className="w-full max-w-md">
                <Select
                    value={selectedEntity || undefined}
                    onValueChange={(value) => onEntityChange(value as EntityKeys)}
                >
                    <SelectTrigger className="w-full bg-card text-card-foreground border-matrxBorder">
                        <SelectValue
                            placeholder={
                                <span className="text-sm">
                                    {selectedEntity
                                     ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                                     : 'Select Entity...'}
                                </span>
                            }
                        />
                    </SelectTrigger>
                    <SelectContent
                        position={layout === 'sideBySide' ? 'popper' : 'item-aligned'}
                        className="bg-card w-[var(--radix-select-trigger-width)]"
                        align="center"
                        side="bottom"
                    >
                        {entitySelectOptions.map(({value, label}) => (
                            <SelectItem
                                key={value}
                                value={value}
                                className="bg-card text-card-foreground hover:bg-muted"
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
