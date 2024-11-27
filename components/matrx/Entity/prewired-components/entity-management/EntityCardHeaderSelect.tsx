// components/matrx/SchemaTable/EntityCardHeaderSelect.tsx
'use client';

import React, { useState } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

    return (
        <CardHeader className="border-2 border-gray-500 flex flex-col lg:flex-row items-center justify-between p-4 lg:p-6 space-y-4 lg:space-y-0 min-h-[6rem] lg:h-24">
            <div className="flex flex-col justify-center text-center lg:text-left">
                <CardTitle className="text-lg lg:text-xl">
                    {selectedEntity
                     ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                     : 'Select Entity'}
                </CardTitle>
                <CardDescription className="text-sm lg:text-base">
                    Browse and manage entity data
                </CardDescription>
            </div>
            <Select
                value={selectedEntity || undefined}
                onValueChange={(value) => handleEntityChange(value as EntityKeys)}
            >
                <SelectTrigger className="w-[280px] lg:w-[400px] h-10 lg:h-12 bg-card text-card-foreground border-matrxBorder">
                    <SelectValue placeholder="Select Entity..." />
                </SelectTrigger>
                <SelectContent>
                    {entitySelectOptions.map(({ value, label }) => (
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
        </CardHeader>    );
};

export default EntityCardHeaderSelect;
