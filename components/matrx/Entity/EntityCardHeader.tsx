// components/matrx/SchemaTable/EntityCardHeader.tsx
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

interface PreWiredCardHeaderProps {
    onEntityChange?: (value: EntityKeys | null) => void;
}

const PreWiredCardHeader: React.FC<PreWiredCardHeaderProps> = ({ onEntityChange }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        onEntityChange?.(value);
    };

    return (
        <CardHeader>
            <CardTitle className="flex justify-between items-center">
                <span>{selectedEntity ? entitySelectOptions.find(option => option.value === selectedEntity)?.label : 'Select Entity'}</span>
                <Select
                    value={selectedEntity || undefined}
                    onValueChange={(value) => handleEntityChange(value as EntityKeys)}
                >
                    <SelectTrigger className="w-[350px] bg-card text-card-foreground border-matrxBorder">
                        <SelectValue placeholder="Select Entity..." />
                    </SelectTrigger>
                    <SelectContent>
                        {entitySelectOptions.map(({ value, label }) => (
                            <SelectItem key={value} value={value} className="bg-card text-card-foreground hover:bg-muted">
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardTitle>
            <CardDescription>
                Browse and manage entity data
            </CardDescription>
        </CardHeader>
    );
};

export default PreWiredCardHeader;
