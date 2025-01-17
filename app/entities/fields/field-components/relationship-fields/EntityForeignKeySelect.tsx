// app/entities/fields/field-components/relationship-fields/EntitySelectSpecial.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { FieldComponentProps } from '../../types';
import MatrxSelectFloatinglabel from '@/components/matrx/MatrxSelectFloatingLabel';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import EntitySheetForm from '@/app/entities/forms/EntitySheetForm';

type EntityForeignKeySelectProps = FieldComponentProps<string>;

const EntityForeignKeySelect = React.forwardRef<HTMLSelectElement, EntityForeignKeySelectProps>(
    (
        { entityKey: parentEntity, dynamicFieldInfo, value, onChange, disabled, className, density, animationPreset, size, textSize, variant, floatingLabel },
        ref
    ) => {
        const relatedEntity = dynamicFieldInfo.foreignKeyReference?.entity as EntityKeys;
        useFetchQuickRef(relatedEntity);
        
        // Find the record key that corresponds to our incoming value
        const { handleRecordSelect, quickReferenceRecords, setFetchMode } = useSelectQuickRef(relatedEntity);
        const [isSheetOpen, setIsSheetOpen] = useState(false);

        // Find the recordKey that matches our primary key value
        const recordKeyForValue = quickReferenceRecords?.find(
            record => record.primaryKeyValues[Object.keys(record.primaryKeyValues)[0]] === value
        )?.recordKey ?? '';

        const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(recordKeyForValue);

        // Update selected record key when value or quick reference records change
        useEffect(() => {
            setFetchMode('native');
            setSelectedRecordKey(recordKeyForValue);
        }, [value, quickReferenceRecords]);

        const handleLocalChange = useCallback(
            (recordKey: string) => {
                if (recordKey === 'new') {
                    setIsSheetOpen(true);
                    return;
                }

                const primaryKeyValue = recordKey === '' ? null : 
                    quickReferenceRecords.find(record => record.recordKey === recordKey)
                        ?.primaryKeyValues[Object.keys(quickReferenceRecords[0].primaryKeyValues)[0]];
                
                handleRecordSelect(recordKey);
                setSelectedRecordKey(recordKey);
                onChange?.(primaryKeyValue);
            },
            [onChange, quickReferenceRecords]
        );

        const enhancedOptions = [
            { value: '', label: '-- None --' },
            ...(quickReferenceRecords?.map((record) => ({ 
                value: record.recordKey, 
                label: record.displayValue 
            })) ?? []),
            { value: 'new', label: '+ Add New' }
        ];

        return (
            <>
                <MatrxSelectFloatinglabel
                    ref={ref}
                    id={dynamicFieldInfo.name}
                    value={selectedRecordKey}
                    onChange={(value) => handleLocalChange(value)}
                    options={enhancedOptions}
                    label={dynamicFieldInfo.displayName}
                    disabled={disabled}
                    className='relative border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 hover:bg-accent/50'
                    required={dynamicFieldInfo.isRequired}
                    floatingLabel={floatingLabel}
                />
                
                <EntitySheetForm
                    mode="create"
                    entityName={relatedEntity}
                    position="right"
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                />
            </>
        );
    }
);

EntityForeignKeySelect.displayName = 'EntityForeignKeySelect';

export default React.memo(EntityForeignKeySelect);
