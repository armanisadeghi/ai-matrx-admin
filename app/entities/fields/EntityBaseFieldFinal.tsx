// app\entities\fields\EntityBaseFieldFinal.tsx

'use client';

import React, { useCallback } from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import FormFieldMotionWrapperFinal from './FormFieldMotionWrapperFinal';
import { StaticFieldConfig, FieldDisableLogic } from './field-management';
import { useFieldValue } from './field-hooks';

export interface EntityBaseFieldFinalProps {
    entityKey: EntityKeys;
    fieldName: string;
    recordId: MatrxRecordId;
    unifiedLayoutProps?: UnifiedLayoutProps;
    className?: string;
    onFieldChange?: (fieldName: string, value: unknown) => void;
    forceEnable?: boolean;
}

const EntityBaseFieldFinal = ({ 
    entityKey, 
    fieldName, 
    recordId, 
    unifiedLayoutProps, 
    className, 
    onFieldChange,
    forceEnable
}: EntityBaseFieldFinalProps) => {
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools(entityKey);

    const entityStatus = useAppSelector(selectors.selectEntityStatus);
    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    return (
        <StaticFieldConfig
            entityKey={entityKey}
            fieldName={fieldName}
            unifiedLayoutProps={unifiedLayoutProps}
        >
            {({ Component, fieldMetadata, styleConfig }) => {
                const [currentValue, setCurrentValue] = useFieldValue(selectors, recordId, fieldName, fieldMetadata);

                const onChange = useCallback(
                    (newValue: unknown) => {
                        // Prevent infinite loops by checking if the value actually changed
                        if (JSON.stringify(newValue) === JSON.stringify(currentValue)) {
                            return;
                        }
                        
                        setCurrentValue(newValue);
                        if (recordId && (operationMode === 'create' || operationMode === 'update')) {
                            dispatch(
                                actions.updateUnsavedField({
                                    recordId,
                                    field: fieldName,
                                    value: newValue,
                                })
                            );
                        }
                        onFieldChange?.(fieldName, newValue);
                    },
                    [dispatch, actions, recordId, fieldName, operationMode, onFieldChange, currentValue]
                );

                return (
                    <FieldDisableLogic
                        entityStatus={entityStatus}
                        operationMode={operationMode}
                        forceEnable={forceEnable} // Pass through the forceEnable prop
                    >
                        {(isDisabled) => (
                            <FormFieldMotionWrapperFinal
                                unifiedLayoutProps={unifiedLayoutProps}
                                className={className}
                            >
                                <Component
                                    entityKey={entityKey}
                                    dynamicFieldInfo={fieldMetadata}
                                    value={currentValue}
                                    onChange={onChange}
                                    disabled={isDisabled}
                                    className={className}
                                    density={styleConfig.density}
                                    animationPreset={styleConfig.animationPreset}
                                    size={styleConfig.size}
                                    textSize={styleConfig.textSize}
                                    variant={styleConfig.variant}
                                    floatingLabel={styleConfig.floatingLabel}
                                />
                            </FormFieldMotionWrapperFinal>
                        )}
                    </FieldDisableLogic>
                );
            }}
        </StaticFieldConfig>
    );
};

export default React.memo(EntityBaseFieldFinal);
