'use client';

import React, { useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';
import { EntityCardHeader } from './EntityCardHeader';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {EntityKeys, EntitySelectOption} from '@/types/entityTypes';

interface EntitySelectProps<TEntity extends EntityKeys> {
    value: TEntity | undefined;
    options: EntitySelectOption<TEntity>[];
    onValueChange: (value: TEntity) => void;
    placeholder?: string;
}


const EntitySelect = <TEntity extends EntityKeys>(
    {
        value,
        options,
        onValueChange,
        placeholder = "Select Entity..."
    }: EntitySelectProps<TEntity>) => (
    <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[280px] lg:w-[400px] h-10 lg:h-12 bg-card text-card-foreground border-matrxBorder">
            <SelectValue placeholder={placeholder}/>
        </SelectTrigger>
        <SelectContent>
            {options.map(({value, label}) => (
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
);


interface EntityCardHeaderSelectProps {
    onEntityChange?: (value: EntityKeys | null) => void;
}

const EntityCardHeaderSelect: React.FC<EntityCardHeaderSelectProps> = ({ onEntityChange }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        onEntityChange?.(value);
    };

    const selectedTitle = selectedEntity
                          ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                          : 'Select Entity';

    return (
        <EntityCardHeader title={selectedTitle}>
            <EntitySelect<EntityKeys>
                value={selectedEntity || undefined}
                options={entitySelectOptions}
                onValueChange={handleEntityChange}
            />
        </EntityCardHeader>
    );
};

export default EntityCardHeaderSelect;
