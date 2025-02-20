import React, { useCallback, useEffect, useState } from 'react';
import { FieldComponentProps } from '../../types';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import EntitySheetForm from '@/app/entities/forms/EntitySheetForm';
import PortalDropdownSelect from '@/components/ui/matrx/PortalDropdownSelect';




type EntityForeignKeySelectProps = FieldComponentProps<string>;

const EntitySearchableFkSelect = React.forwardRef<HTMLDivElement, EntityForeignKeySelectProps>(
    (
        { entityKey: parentEntity, dynamicFieldInfo, value, onChange, disabled, className, density, animationPreset, size, textSize, variant, floatingLabel = true },
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
                    quickReferenceRecords?.find(record => record.recordKey === recordKey)
                        ?.primaryKeyValues[Object.keys(quickReferenceRecords[0].primaryKeyValues)[0]];
                
                handleRecordSelect(recordKey);
                setSelectedRecordKey(recordKey);
                onChange?.(primaryKeyValue);
            },
            [onChange, quickReferenceRecords, handleRecordSelect]
        );

        const selectOptions = [
            { value: '', label: '-- None --' },
            ...(quickReferenceRecords?.map((record) => ({ 
                value: record.recordKey, 
                label: record.displayValue 
            })) ?? []),
            { value: 'new', label: '+ Add New' }
        ];

        // Custom styles to exactly match MatrxSelectFloatinglabel
        const customStyles = {
            container: "",
            trigger: `!bg-zinc-50 dark:!bg-zinc-800 border-zinc-200 dark:border-zinc-700 
                       hover:!bg-accent/50 dark:hover:!bg-accent/50
                       focus:!border-zinc-300 dark:focus:!border-zinc-600`,
            dropdown: "!bg-zinc-50 dark:!bg-zinc-800 border-zinc-300 dark:border-zinc-700",
            option: "hover:!bg-accent/20 dark:hover:!bg-accent/20 text-foreground",
            optionSelected: "!bg-accent/30 dark:!bg-accent/30",
            floatingLabel: "dark:text-blue-500 text-blue-500 z-20 text-sm"
        };

        return (
            <>
                <div ref={ref}>
                    <PortalDropdownSelect
                        id={dynamicFieldInfo.name}
                        value={selectedRecordKey}
                        onChange={handleLocalChange}
                        options={selectOptions}
                        label={dynamicFieldInfo.displayName}
                        disabled={disabled}
                        className={`relative ${className || ''}`}
                        required={dynamicFieldInfo.isRequired}
                        floatingLabel={floatingLabel}
                        error={false}
                        customStyles={customStyles}
                    />
                </div>
                
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

EntitySearchableFkSelect.displayName = 'EntitySearchableFkSelect';

export default React.memo(EntitySearchableFkSelect);