// components/matrx/Entity/records/PreWiredEntityRecordHeader.tsx
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
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {
    QuickReferenceRecord,
    MatrxRecordId,
    EntityError
} from '@/lib/redux/entity/types';
import {createRecordKey} from '@/lib/redux/entity/utils';
import type {Draft} from 'immer';

interface PreWiredEntityRecordHeaderProps {
    onEntityChange?: (entity: EntityKeys | null) => void;
    onRecordLoad?: (record: EntityData<EntityKeys>) => void;
    onError?: (error: EntityError) => void;
}

interface RecordSelectorProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onRecordLoad: (record: EntityData<TEntity>) => void;
    onError?: (error: EntityError) => void;
    onLabelChange: (label: string) => void;
}

function RecordSelector<TEntity extends EntityKeys>(
    {
        entityKey,
        onRecordLoad,
        onError,
        onLabelChange
    }: RecordSelectorProps<TEntity>) {
    const entity = useEntity(entityKey);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
    const [isLoadingRecord, setIsLoadingRecord] = useState(false);


    useEffect(() => {
        if (!selectedRecordKey || !entity.entityMetadata?.primaryKeyMetadata || !isLoadingRecord) return;

        const primaryKeyValues = JSON.parse(selectedRecordKey) as Record<string, MatrxRecordId>;
        const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        const record = entity.allRecords[recordKey];

        if (record && !entity.loadingState.loading) {
            setIsLoadingRecord(false);
            entity.setSelection([record as Draft<EntityData<TEntity>>], 'single');
            onRecordLoad(record as EntityData<TEntity>);
        }
    }, [entity.allRecords, entity.loadingState.loading, selectedRecordKey]);


    useEffect(() => {
        if (!selectedRecordKey || isLoadingRecord) return;

        const fetchRecord = async () => {
            try {
                const primaryKeyValues = JSON.parse(selectedRecordKey) as Record<string, MatrxRecordId>;

                if (!entity.entityMetadata?.primaryKeyMetadata) {
                    onError?.({
                        message: 'Entity metadata not available',
                        details: 'Primary key metadata is missing',
                        lastOperation: 'fetch'
                    });
                    return;
                }

                setIsLoadingRecord(true);
                entity.fetchOne(primaryKeyValues);

            } catch (error) {
                setIsLoadingRecord(false);
                onError?.({
                    message: 'Failed to fetch record',
                    details: error,
                    lastOperation: 'fetch'
                });
            }
        };

        fetchRecord();
    }, [selectedRecordKey]);

    useEffect(() => {
        if (entity.entityMetadata) {
            try {
                entity.fetchQuickReference();
            } catch (error) {
                onError?.({
                    message: 'Failed to fetch quick reference data',
                    details: error,
                    lastOperation: 'fetch'
                });
            }
        }
    }, [entityKey]);

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
            disabled={isLoadingRecord}
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
}

const PreWiredEntityRecordHeader: React.FC<PreWiredEntityRecordHeaderProps> = (
    {
        onEntityChange,
        onRecordLoad,
        onError
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

    const handleRecordLoad = (record: EntityData<EntityKeys>) => {
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
                            onError={onError}
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
