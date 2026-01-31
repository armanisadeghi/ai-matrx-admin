import React, { useState, useCallback, useEffect } from 'react';
import { FieldComponentProps } from '../../../types';
import { MatrxRecordId } from '@/types/entityTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import FieldListTableOverlay from '@/features/applet/builder/modules/field-builder/FieldListTableOverlay';
import { ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityTools } from '@/lib/redux';
import { useAppDispatch } from '@/lib/redux/hooks';
import { entityDefaultSettings } from '@/lib/redux/entity/constants/defaults';

type FieldComponentsFkCustomProps = FieldComponentProps<string>;

const FieldComponentsFkCustom = React.forwardRef<HTMLDivElement, FieldComponentsFkCustomProps>(
    (
        { entityKey: parentEntity, dynamicFieldInfo, value, onChange, disabled, className, density, animationPreset, size, textSize, variant, floatingLabel = true },
        ref
    ) => {
        const relatedEntity = 'fieldComponents';
        const dispatch = useAppDispatch();
        const { actions } = useEntityTools(relatedEntity);
        
        useFetchQuickRef(relatedEntity);
        
        const { quickReferenceRecords, setFetchMode } = useSelectQuickRef(relatedEntity);
        const [isOverlayOpen, setIsOverlayOpen] = useState(false);
        
        // Find the record that matches our current value
        const matchingRecord = quickReferenceRecords?.find(
            record => record.primaryKeyValues[Object.keys(record.primaryKeyValues)[0]] === value
        );
        
        // Set fetch mode to native
        useEffect(() => {
            setFetchMode('native');
        }, [setFetchMode]);
        
        const handleFieldSelect = useCallback((fieldId: string) => {
            onChange?.(fieldId);
            setIsOverlayOpen(false);
        }, [onChange]);
        
        const handleFieldCreated = useCallback((fieldId: string) => {
            onChange?.(fieldId);
            setIsOverlayOpen(false);
            // Force a refresh of the quick reference data to get the latest records
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
            }));
        }, [onChange, dispatch, actions]);
        
        const handleFieldUpdated = useCallback((fieldId: string) => {
            // Field was updated, we might need to refresh the display
            // The value hasn't changed, so no need to call onChange
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
            }));
        }, [dispatch, actions]);
        
        const handleOpenOverlay = useCallback(() => {
            if (!disabled) {
                setIsOverlayOpen(true);
            }
        }, [disabled]);
        
        // Get the label from the matching record for better display
        const fieldLabel = matchingRecord?.displayValue || '';
        const hasValidRecord = !!matchingRecord;
        
        // Display values
        const primaryDisplay = hasValidRecord ? fieldLabel : (value ? 'Unknown Field' : 'No field selected');
        const secondaryDisplay = value ? `ID: ${value}` : null;
        
        return (
            <>
                <div ref={ref} className={`relative ${className || ''}`}>
                    <div className="flex items-center w-full">
                        {/* Display area that looks like an input but is read-only */}
                        <div className="flex-1 relative">
                            <div 
                                className={`
                                    w-full px-3 py-2 border rounded-md 
                                    bg-zinc-50 dark:bg-zinc-800 
                                    border-zinc-200 dark:border-zinc-700
                                    text-foreground
                                    min-h-[48px] flex flex-col justify-center
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/50'}
                                    focus-within:border-zinc-300 dark:focus-within:border-zinc-600
                                `}
                                onClick={handleOpenOverlay}
                            >
                                {/* Primary display (label) */}
                                <span className={`${!value ? 'text-muted-foreground' : 'text-foreground'} leading-tight`}>
                                    {primaryDisplay}
                                </span>
                                
                                {/* Secondary display (ID) - only show if we have a value */}
                                {secondaryDisplay && (
                                    <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
                                        {secondaryDisplay}
                                    </span>
                                )}
                            </div>
                            
                            {/* Floating label */}
                            {floatingLabel && (
                                <span className="absolute left-0 top-0 px-1 text-xs text-blue-500 dark:text-blue-500 transform -translate-y-2 translate-x-2 bg-zinc-50 dark:bg-zinc-800 z-20">
                                    {dynamicFieldInfo.displayName}
                                    {dynamicFieldInfo.isRequired && <span className="text-red-500 ml-1">*</span>}
                                </span>
                            )}
                        </div>
                        
                        {/* Browse icon button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenOverlay}
                            disabled={disabled}
                            className="ml-2 h-[48px] px-3"
                            title="Browse field components"
                        >
                            <ListIcon size={16} />
                        </Button>
                    </div>
                </div>
                
                {/* Field Management Overlay */}
                <FieldListTableOverlay
                    isOpen={isOverlayOpen}
                    onOpenChange={setIsOverlayOpen}
                    onFieldSelect={handleFieldSelect}
                    onFieldCreated={handleFieldCreated}
                    onFieldUpdated={handleFieldUpdated}
                    overlayTitle="Select Field Component"
                    overlaySize="3xl"
                    defaultPageSize={20}
                    closeOnSelect={true}
                    autoConfigureForOverlay={true}
                    allowCreate={true}
                    allowEdit={true}
                    allowView={true}
                    allowDelete={true}
                    allowSelectAction={true}
                    showStripedRows={true}
                    allowRefresh={true}
                />
            </>
        );
    }
);

FieldComponentsFkCustom.displayName = 'FieldComponentsFkCustom';

export default React.memo(FieldComponentsFkCustom); 