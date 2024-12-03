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
import {UnifiedLayoutProps} from "@/components/matrx/Entity";


const SmartEntitySelection: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);
    const selectedEntity = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectContentPosition = unifiedLayoutProps.selectComponentOptions.selectContentPosition || 'sideBySide';

    return (
        <div className="flex justify-center w-full">
            <div className="w-full max-w-md">
                <Select
                    value={selectedEntity}
                    onValueChange={(value) => unifiedLayoutProps.handlers.handleEntityChange(value as EntityKeys)}
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
                        position={selectContentPosition === 'sideBySide' ? 'popper' : 'item-aligned'}
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

export default SmartEntitySelection;
