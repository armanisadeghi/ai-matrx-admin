// entity-final-test/field-management.tsx
'use client';

import React, {useMemo} from 'react';
import {EntityKeys} from "@/types/entityTypes";
import {
    EntityStateField,
    EntityStatus,
    EntityOperationMode
} from "@/lib/redux/entity/types/stateTypes";
import {noErrors} from '@/utils';
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {
    createEntitySelectors,
    RootState,
    useAppSelector,
} from "@/lib/redux";
import {ENTITY_FIELD_COMPONENTS} from "./component-lookup";

export const FieldDisableLogic = React.memo((
    {
        children,
        entityStatus,
        operationMode
    }: {
        children: (isDisabled: boolean) => React.ReactNode;
        entityStatus: EntityStatus;
        operationMode: EntityOperationMode | undefined;
    }) => {
    const isDisabled = useMemo(() => {
        if (entityStatus === 'loading' || entityStatus === 'error') {
            return true;
        }

        switch (operationMode) {
            case 'view':
            case 'delete':
                return true;
            case 'create':
            case 'update':
                return false;
            default:
                return true;
        }
    }, [entityStatus, operationMode]);

    return <>{children(isDisabled)}</>;
});

interface StaticFieldConfigProps {
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
}

export const StaticFieldConfig = React.memo((props: StaticFieldConfigProps) => {
    const {entityKey, fieldName, unifiedLayoutProps, children} = props;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const selectField = useMemo(() =>
            (state: RootState) => selectors.selectFieldMetadata(state, fieldName)
        , [selectors, fieldName]);

    const fieldMetadata = useAppSelector(selectField) as EntityStateField;

    const safeComponent = useMemo(() =>
            noErrors(fieldMetadata?.defaultComponent, 'INPUT', ['INPUT', 'TEXTAREA', 'SWITCH', 'SELECT']) // NO longer in use.
        , [fieldMetadata]);

    const Component = ENTITY_FIELD_COMPONENTS[fieldMetadata?.defaultComponent];

    const styleConfig = useMemo(() => ({
        density: unifiedLayoutProps?.dynamicStyleOptions?.density || 'normal',
        animationPreset: unifiedLayoutProps?.dynamicStyleOptions?.animationPreset || 'smooth',
        size: unifiedLayoutProps?.dynamicStyleOptions?.size || 'default',
        variant: unifiedLayoutProps?.dynamicStyleOptions?.variant || 'default',
        floatingLabel: unifiedLayoutProps?.dynamicLayoutOptions?.formStyleOptions?.floatingLabel ?? true
    }), [unifiedLayoutProps]);

    if (!fieldMetadata) return null;

    return <>{children({Component, fieldMetadata, styleConfig})}</>;
});
