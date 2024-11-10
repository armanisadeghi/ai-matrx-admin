'use client';

import React, {useState, useMemo} from 'react';
import {CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
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
import {useEntity} from '@/lib/redux/entity/useEntity';
import {QuickReferenceRecord} from '@/lib/redux/entity/types';

interface PreWiredEntityRecordHeaderProps {
    onEntityChange?: (value: EntityKeys | null) => void;
    onRecordChange?: (primaryKeyValues: Record<string, any> | null) => void;
}

// Separate component for record selection to maintain proper hook ordering
const RecordSelector: React.FC<{
    entityKey: EntityKeys;
    onRecordChange: (primaryKeyValues: Record<string, any> | null) => void;
}> = ({entityKey, onRecordChange}) => {
    const entity = useEntity(entityKey);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);

    // Fetch quick reference data when entity changes
    React.useEffect(() => {
        if (entity.entityMetadata) {
            entity.fetchQuickReference();
        }
    }, [entity.entityMetadata]);

    const quickReferenceOptions = useMemo(() => {
        if (!entity?.quickReference) return [];

        return entity.quickReference.map((record: QuickReferenceRecord) => ({
            value: JSON.stringify(record.primaryKeyValues),
            label: record.displayValue || JSON.stringify(record.primaryKeyValues)
        }));
    }, [entity?.quickReference]);

    const handleRecordSelect = (value: string) => {
        setSelectedRecordKey(value);
        const primaryKeyValues = JSON.parse(value);
        onRecordChange(primaryKeyValues);
    };

    return (
        <Select
            value={selectedRecordKey || ''}
            onValueChange={handleRecordSelect}
        >
            <SelectTrigger className="w-[350px] bg-card text-card-foreground border-matrxBorder">
                <SelectValue placeholder="Select Record..."/>
            </SelectTrigger>
            <SelectContent>
                {quickReferenceOptions.map(({value, label}) => (
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
};

const PreWiredEntityRecordHeader: React.FC<PreWiredEntityRecordHeaderProps> = (
    {
        onEntityChange,
        onRecordChange
    }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        onEntityChange?.(value);
        onRecordChange?.(null);
    };

    return (
        <CardHeader>
            <CardTitle className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <span>
                        {selectedEntity
                         ? entitySelectOptions.find(option => option.value === selectedEntity)?.label
                         : 'Select Entity'}
                    </span>
                    <Select
                        value={selectedEntity || undefined}
                        onValueChange={(value) => handleEntityChange(value as EntityKeys)}
                    >
                        <SelectTrigger className="w-[350px] bg-card text-card-foreground border-matrxBorder">
                            <SelectValue placeholder="Select Entity..."/>
                        </SelectTrigger>
                        <SelectContent>
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

                {selectedEntity && (
                    <div className="flex justify-between items-center">
                        <span>Select Record</span>
                        <RecordSelector
                            entityKey={selectedEntity}
                            onRecordChange={onRecordChange}
                        />
                    </div>
                )}
            </CardTitle>
            <CardDescription>
                Browse and manage entity records
            </CardDescription>
        </CardHeader>
    );
};

export default PreWiredEntityRecordHeader;
