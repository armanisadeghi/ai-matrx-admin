'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {ENTITY_FIELD_COMPONENTS} from '@/components/matrx/ArmaniForm/field-components';
import {EntityKeys} from "@/types/entityTypes";
import {EntityStateField, EntityStatus, MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {noErrors} from '@/utils';
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {
    createEntitySelectors,
    getEntitySlice,
    RootState,
    useAppDispatch,
    useAppSelector,
} from "@/lib/redux";
import FormFieldMotionWrapperFinal
    from "@/app/(authenticated)/tests/forms/entity-final-test/FormFieldMotionWrapperFinal";

export interface EntityBaseFieldFinalProps {
    entityKey: EntityKeys;
    fieldName: string;
    recordId?: MatrxRecordId;
    unifiedLayoutProps?: UnifiedLayoutProps;
    className?: string;
}

const FieldStatusWrapper = React.memo(({
    children,
    entityStatus
}: {
    children: (isDisabled: boolean) => React.ReactNode;
    entityStatus: EntityStatus;
}) => {
    const isDisabled = useMemo(() => {
        switch (entityStatus) {
            case 'loading':
            case 'error':
                return true;
            default:
                return false;
        }
    }, [entityStatus]);

    return <>{children(isDisabled)}</>;
});

const StaticFieldConfig = React.memo(({
    entityKey,
    fieldName,
    unifiedLayoutProps,
    children
}: {
    entityKey: EntityKeys;
    fieldName: string;
    unifiedLayoutProps?: UnifiedLayoutProps;
    children: (config: {
        Component: React.ComponentType<any>;
        fieldMetadata: EntityStateField;
        styleConfig: {
            density: string;
            animationPreset: string;
            size: string;
            variant: string;
            floatingLabel: boolean;
        };
    }) => React.ReactNode;
}) => {
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const selectField = useMemo(() =>
        (state: RootState) => selectors.selectFieldMetadata(state, fieldName)
    , [selectors, fieldName]);

    const fieldMetadata = useAppSelector(selectField) as EntityStateField;

    const safeComponent = useMemo(() =>
        noErrors(fieldMetadata?.defaultComponent, 'INPUT', ['INPUT', 'TEXTAREA'])
    , [fieldMetadata]);

    const Component = ENTITY_FIELD_COMPONENTS[safeComponent];

    const styleConfig = useMemo(() => ({
        density: unifiedLayoutProps?.dynamicStyleOptions?.density || 'normal',
        animationPreset: unifiedLayoutProps?.dynamicStyleOptions?.animationPreset || 'smooth',
        size: unifiedLayoutProps?.dynamicStyleOptions?.size || 'default',
        variant: unifiedLayoutProps?.dynamicStyleOptions?.variant || 'default',
        floatingLabel: unifiedLayoutProps?.dynamicLayoutOptions?.formStyleOptions?.floatingLabel ?? true
    }), [unifiedLayoutProps]);

    if (!fieldMetadata) return null;

    return <>{children({ Component, fieldMetadata, styleConfig })}</>;
});

const EntityBaseFieldFinal = ({
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

    const databaseValue = useAppSelector(
        state => recordId ? selectors.selectFieldValue(state, recordId, fieldName) : undefined
    );

    const [currentValue, setCurrentValue] = useState(databaseValue ?? undefined);

    const onChange = useCallback((newValue: unknown) => {
        setCurrentValue(newValue);
        if (recordId) {
            dispatch(actions.updateUnsavedField({
                recordId,
                field: fieldName,
                value: newValue
            }));
        }
    }, [dispatch, actions, recordId, fieldName]);

    return (
        <StaticFieldConfig
            entityKey={entityKey}
            fieldName={fieldName}
            unifiedLayoutProps={unifiedLayoutProps}
        >
            {({ Component, fieldMetadata, styleConfig }) => (
                <FieldStatusWrapper entityStatus={entityStatus}>
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
                                {...styleConfig}
                            />
                        </FormFieldMotionWrapperFinal>
                    )}
                </FieldStatusWrapper>
            )}
        </StaticFieldConfig>
    );
};

export default React.memo(EntityBaseFieldFinal);
