import React, { useCallback, useEffect, useState, useRef } from 'react';
import { FieldComponentProps } from '../../types';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import EntitySheetForm from '@/app/entities/forms/EntitySheetForm';
import PortalDropdownSelect from '@/components/ui/matrx/PortalDropdownSelect';
import { PencilIcon, CheckIcon, XIcon } from 'lucide-react';
import CustomFkHandler from './CustomFkHandler';

type EntityForeignKeySelectProps = FieldComponentProps<string>;

// Default implementation component (extracted from the main component)
const DefaultEntitySearchableFkSelect = React.forwardRef<HTMLDivElement, EntityForeignKeySelectProps>(
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
        const matchingRecord = quickReferenceRecords?.find(
            record => record.primaryKeyValues[Object.keys(record.primaryKeyValues)[0]] === value
        );
        const recordKeyForValue = matchingRecord?.recordKey ?? '';
        const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(recordKeyForValue);
        
        // Track if we have a value that's not in the available records
        const [hasUnknownValue, setHasUnknownValue] = useState<boolean>(!!value && !matchingRecord);
        
        // States for manual ID entry
        const [showManualInput, setShowManualInput] = useState(false);
        const [manualIdValue, setManualIdValue] = useState(value || '');
        const manualInputRef = useRef<HTMLInputElement>(null);
        
        // Update selected record key when value or quick reference records change
        useEffect(() => {
            setFetchMode('native');
            setSelectedRecordKey(recordKeyForValue);
            setManualIdValue(value || '');
            
            // Check if we have a value that's not in the available records
            const hasUnknownVal = !!value && !quickReferenceRecords?.some(
                record => record.primaryKeyValues[Object.keys(record.primaryKeyValues)[0]] === value
            );
            setHasUnknownValue(hasUnknownVal);
        }, [value, quickReferenceRecords]);
        
        // Focus the input when manual entry mode is activated
        useEffect(() => {
            if (showManualInput && manualInputRef.current) {
                manualInputRef.current.focus();
            }
        }, [showManualInput]);
        
        const handleLocalChange = useCallback(
            (recordKey: string) => {
                if (recordKey === 'new') {
                    setIsSheetOpen(true);
                    return;
                }
                
                if (recordKey === 'unknown') {
                    // Keep the current value when selecting the "unknown" option
                    return;
                }
                
                const primaryKeyValue = recordKey === '' ? null : 
                    quickReferenceRecords?.find(record => record.recordKey === recordKey)
                        ?.primaryKeyValues[Object.keys(quickReferenceRecords[0].primaryKeyValues)[0]];
                
                handleRecordSelect(recordKey);
                setSelectedRecordKey(recordKey);
                onChange?.(primaryKeyValue);
                setHasUnknownValue(false);
            },
            [onChange, quickReferenceRecords, handleRecordSelect]
        );
        
        const handleManualIdSubmit = () => {
            onChange?.(manualIdValue);
            setShowManualInput(false);
        };
        
        const handleManualIdCancel = () => {
            setManualIdValue(value || '');
            setShowManualInput(false);
        };
        
        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleManualIdSubmit();
            } else if (e.key === 'Escape') {
                handleManualIdCancel();
            }
        };
        
        // Create options including the unknown value if needed
        const selectOptions = [
            { value: '', label: '-- None --' },
            { value: 'new', label: '+ Add New' },
            ...(quickReferenceRecords?.map((record) => ({ 
                value: record.recordKey, 
                label: record.displayValue 
            })) ?? []),
            ...(hasUnknownValue ? [{ 
                value: 'unknown', 
                label: `ID: ${value}`
            }] : []),
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
                <div ref={ref} className={`relative ${className || ''}`}>
                    {showManualInput ? (
                        <div className="flex items-center w-full">
                            <div className="relative flex-grow">
                                <input
                                    ref={manualInputRef}
                                    type="text"
                                    value={manualIdValue}
                                    onChange={(e) => setManualIdValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                    placeholder="Enter ID manually"
                                    disabled={disabled}
                                />
                                <span className="absolute left-0 top-0 px-1 text-xs text-blue-500 transform -translate-y-2 translate-x-2 bg-zinc-50 dark:bg-zinc-800">
                                    {dynamicFieldInfo.displayName}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleManualIdSubmit}
                                className="p-1 ml-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                disabled={disabled}
                            >
                                <CheckIcon size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={handleManualIdCancel}
                                className="p-1 ml-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                disabled={disabled}
                            >
                                <XIcon size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <PortalDropdownSelect
                                id={dynamicFieldInfo.name}
                                value={hasUnknownValue ? 'unknown' : selectedRecordKey}
                                onChange={handleLocalChange}
                                options={selectOptions}
                                label={dynamicFieldInfo.displayName}
                                disabled={disabled}
                                required={dynamicFieldInfo.isRequired}
                                floatingLabel={floatingLabel}
                                error={false}
                                customStyles={customStyles}
                            />
                            <button
                                type="button"
                                onClick={() => setShowManualInput(true)}
                                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                                title="Enter ID manually"
                                disabled={disabled}
                            >
                                <PencilIcon size={14} />
                            </button>
                        </>
                    )}
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

DefaultEntitySearchableFkSelect.displayName = 'DefaultEntitySearchableFkSelect';

// Main component that routes to custom implementations or default
const EntitySearchableFkSelect = React.forwardRef<HTMLDivElement, EntityForeignKeySelectProps>(
    (props, ref) => {
        const relatedEntity = props.dynamicFieldInfo.foreignKeyReference?.entity as EntityKeys;

        useEffect(() => {
            console.log("EntitySearchableFkSelect", relatedEntity);
            if (relatedEntity === 'fieldComponents') {
                console.log("EntitySearchableFkSelect has a field component", relatedEntity);
            }
        }, [relatedEntity]);

        return (
            <CustomFkHandler
                {...props}
                ref={ref}
                relatedEntity={relatedEntity}
                DefaultComponent={DefaultEntitySearchableFkSelect}
            />
        );
    }
);

EntitySearchableFkSelect.displayName = 'EntitySearchableFkSelect';

export default React.memo(EntitySearchableFkSelect);