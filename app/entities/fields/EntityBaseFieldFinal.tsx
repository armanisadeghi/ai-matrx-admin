// app\entities\fields\EntityBaseFieldFinal.tsx

'use client';

import React, {useCallback, useMemo} from 'react';
import {EntityKeys} from "@/types/entityTypes";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {createEntitySelectors, getEntitySlice, useAppDispatch, useAppSelector,} from "@/lib/redux";
import FormFieldMotionWrapperFinal from "./FormFieldMotionWrapperFinal";
import {StaticFieldConfig, FieldDisableLogic} from './field-management';
import {useFieldValue} from './field-hooks';

export interface EntityBaseFieldFinalProps {
    entityKey: EntityKeys;
    fieldName: string;
    recordId?: MatrxRecordId;
    unifiedLayoutProps?: UnifiedLayoutProps;
    className?: string;
}

const EntityBaseFieldFinal = (
    {
        entityKey,
        fieldName,
        recordId = null,
        unifiedLayoutProps,
        className,
    }: EntityBaseFieldFinalProps) => {
    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const entityStatus = useAppSelector(selectors.selectEntityStatus);
    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    return (
        <StaticFieldConfig
            entityKey={entityKey}
            fieldName={fieldName}
            unifiedLayoutProps={unifiedLayoutProps}
        >
            {({Component, fieldMetadata, styleConfig}) => {
                const [currentValue, setCurrentValue] = useFieldValue(
                    selectors,
                    recordId,
                    fieldName,
                    fieldMetadata,
                    operationMode
                );

                const onChange = useCallback((newValue: unknown) => {
                    setCurrentValue(newValue);
                    if (recordId && (operationMode === 'create' || operationMode === 'update')) {
                        dispatch(actions.updateUnsavedField({
                            recordId,
                            field: fieldName,
                            value: newValue
                        }));
                    }
                }, [dispatch, actions, recordId, fieldName, operationMode]);

                return (
                    <FieldDisableLogic
                        entityStatus={entityStatus}
                        operationMode={operationMode}
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
