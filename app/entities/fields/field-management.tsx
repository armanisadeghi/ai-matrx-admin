// entity-final-test/field-management.tsx
'use client';

import React, { useMemo } from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { EntityStateField, EntityStatus, EntityOperationMode } from '@/lib/redux/entity/types/stateTypes';
import { noErrors } from '@/utils';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, RootState, useAppSelector } from '@/lib/redux';
import { ENTITY_FIELD_COMPONENTS } from './component-lookup';
import { AnimationPreset, ComponentDensity, ComponentSize, TextSizeOptions } from '@/types/componentConfigTypes';
import { MatrxVariant } from '@/components/matrx/ArmaniForm/field-components/types';

export const FieldDisableLogic = React.memo(
    ({
        children,
        entityStatus,
        operationMode,
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
    }
);

interface StaticFieldConfigProps {
    entityKey: EntityKeys;
    fieldName: string;
    unifiedLayoutProps?: UnifiedLayoutProps;
    children: (config: {
        Component: React.ComponentType<any>;
        fieldMetadata: EntityStateField;
        styleConfig: {
            size: ComponentSize;
            textSize: TextSizeOptions;
            density: ComponentDensity;
            animationPreset: AnimationPreset;
            variant: MatrxVariant;
            floatingLabel: boolean;
        };
    }) => React.ReactNode;
}

export const StaticFieldConfig = React.memo((props: StaticFieldConfigProps) => {
    const { entityKey, fieldName, unifiedLayoutProps, children } = props;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const selectField = useMemo(() => (state: RootState) => selectors.selectFieldMetadata(state, fieldName), [selectors, fieldName]);

    const fieldMetadata = useAppSelector(selectField) as EntityStateField;

    const safeComponent = useMemo(
        () =>
            noErrors(fieldMetadata?.defaultComponent, 'INPUT', [
                'INPUT',
                'TEXTAREA',
                'SWITCH',
                'SELECT',
                'UUID_FIELD',
                'UUID_ARRAY',
                'NUMBER_INPUT',
                'DATE_PICKER',
                'JSON_EDITOR',
                'FK_SELECT',
                'SPECIAL',
            ]),
        [fieldMetadata]
    );

    const Component = ENTITY_FIELD_COMPONENTS[safeComponent];

    const styleConfig = useMemo(
        () => ({
            density: unifiedLayoutProps?.dynamicStyleOptions?.density || 'normal',
            animationPreset: unifiedLayoutProps?.dynamicStyleOptions?.animationPreset || 'smooth',
            size: unifiedLayoutProps?.dynamicStyleOptions?.size || 'default',
            textSize: unifiedLayoutProps?.dynamicStyleOptions?.textSize || 'default',
            variant: unifiedLayoutProps?.dynamicStyleOptions?.variant || 'default',
            floatingLabel: unifiedLayoutProps?.dynamicLayoutOptions?.formStyleOptions?.floatingLabel ?? true,
        }),
        [unifiedLayoutProps]
    );

    if (!fieldMetadata) return null;

    return <>{children({ Component, fieldMetadata, styleConfig })}</>;
});

const default_component_count = {
    UUID_FIELD: 38,
    INPUT: 37,
    FK_SELECT: 44,
    TEXTAREA: 48,
    SWITCH: 15,
    JSON_EDITOR: 43,
    NUMBER_INPUT: 26,
    DATE_PICKER: 16,
    SELECT: 18,
    UUID_ARRAY: 2,
} as const;
