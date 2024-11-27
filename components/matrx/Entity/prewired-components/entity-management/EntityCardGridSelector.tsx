// components/matrx/SchemaTable/EntityCardHeaderSelect.tsx
'use client';

import React, {useState} from 'react';
import {CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {useAppSelector} from '@/lib/redux/hooks';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {EntityKeys} from '@/types/entityTypes';

interface EntityCardHeaderSelectProps {
    onEntityChange?: (value: EntityKeys | null) => void;
}

const EntityCardHeaderSelect: React.FC<EntityCardHeaderSelectProps> = ({onEntityChange}) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        onEntityChange?.(value);
    };

    return (
        <CardHeader
            className="border-2 border-gray-500 flex flex-col lg:flex-row items-center justify-between p-4 lg:p-6 space-y-4 lg:space-y-0 min-h-[6rem] lg:h-24">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {entitySelectOptions.map(({value, label}) => (
                    <button
                        key={value}
                        onClick={() => setSelectedEntity(value)}
                        className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                            selectedEntity === value
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}
                    >
                        <h3 className="font-semibold">{label}</h3>
                    </button>
                ))}
            </div>
        </CardHeader>
    );
};

export default EntityCardHeaderSelect;
