'use client';

import React, {useState, useMemo, useEffect} from 'react';
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
import {createRecordKey} from '@/lib/redux/entity/utils';

interface PreWiredEntityRecordHeaderProps {
    onEntityChange?: (entity: EntityKeys | null) => void;
    onRecordLoad?: (record: any) => void;
}

interface RecordSelectorProps {
    entityKey: EntityKeys;
    onRecordLoad: (record: any) => void;
    onLabelChange: (label: string) => void;
}

const RecordSelector: React.FC<RecordSelectorProps> = ({
                                                           entityKey,
                                                           onRecordLoad,
                                                           onLabelChange
                                                       }) => {
    const entity = useEntity(entityKey);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);

    // Fetch quick reference data when entity changes
    useEffect(() => {
        if (entity.entityMetadata) {
            entity.fetchQuickReference();
        }
    }, [entityKey]); // Only depend on entityKey change

    // Handle record fetch and selection
    useEffect(() => {
        if (!selectedRecordKey) return;

        const primaryKeyValues = JSON.parse(selectedRecordKey);
        if (!primaryKeyValues || !entity.entityMetadata?.primaryKeyMetadata) return;

        entity.fetchOne(primaryKeyValues);
    }, [selectedRecordKey]); // Only depend on selectedRecordKey change

    // Handle record loading completion separately
    useEffect(() => {
        if (!selectedRecordKey || !entity.entityMetadata?.primaryKeyMetadata) return;

        const primaryKeyValues = JSON.parse(selectedRecordKey);
        const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);

        if (entity.allRecords[recordKey] && !entity.loadingState.loading) {
            const record = entity.allRecords[recordKey];
            entity.setSelection([record], 'single');
            onRecordLoad(record);
        }
    }, [entity.allRecords, entity.loadingState.loading, selectedRecordKey]);

    const quickReferenceOptions = useMemo(() => {
        if (!entity?.quickReference) return [];

        return entity.quickReference.map((record: QuickReferenceRecord) => ({
            value: JSON.stringify(record.primaryKeyValues),
            label: record.displayValue || JSON.stringify(record.primaryKeyValues)
        }));
    }, [entity?.quickReference]);

    const handleRecordSelect = (value: string) => {
        const option = quickReferenceOptions.find(opt => opt.value === value);
        onLabelChange(option?.label || 'Select Record');
        setSelectedRecordKey(value);
    };

    return (
        <Select
            value={selectedRecordKey || ''}
            onValueChange={handleRecordSelect}
        >
            <SelectTrigger className="w-[350px] bg-card text-card-foreground border-matrxBorder">
                <SelectValue placeholder="Select Record"/>
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
        onRecordLoad
    }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        setHasSelection(false);
        setRecordLabel('Select Record');
        onEntityChange?.(value);
    };

    const handleRecordLoad = (record: any) => {
        setHasSelection(true);
        onRecordLoad?.(record);
    };

    const handleRecordLabelChange = (label: string) => {
        setRecordLabel(label);
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
                        <span>{recordLabel}</span>
                        <RecordSelector
                            entityKey={selectedEntity}
                            onRecordLoad={handleRecordLoad}
                            onLabelChange={handleRecordLabelChange}
                        />
                    </div>
                )}
            </CardTitle>
            {!hasSelection && (
                <CardDescription>
                    Browse and manage entity records
                </CardDescription>
            )}
        </CardHeader>
    );
};

export default PreWiredEntityRecordHeader;
