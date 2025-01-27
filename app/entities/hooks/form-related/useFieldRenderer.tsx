'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import EntityBaseFieldFinal from '@/app/entities/fields/EntityBaseFieldFinal';
import EntityRelationshipWrapperFinal from '@/app/entities/relationships/EntityRelationshipWrapperFinal';
import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from '@/types/entityTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

export interface FieldRendererOptions {
    onFieldChange?: (fieldName: string, value: unknown) => void;
}

export function useFieldRenderer<TEntity extends EntityKeys>(
    entityKey: TEntity | null,
    activeRecordId: MatrxRecordId | null,
    unifiedLayoutProps: UnifiedLayoutProps,
    options?: FieldRendererOptions
) {
    const instanceId = useRef(Math.random().toString(36).slice(2, 9));

    const handleFieldChange = useCallback(
        (fieldName: string, value: unknown) => {
            options?.onFieldChange?.(fieldName, value);
        },
        [options]
    );

    const getNativeFieldComponent = useCallback(
        (fieldName: EntityAnyFieldKey<TEntity>) => {
            const key = `${activeRecordId || instanceId.current}-${fieldName}`;
            
            return (
                <div key={key} className='w-full'>
                    <EntityBaseFieldFinal
                        fieldName={fieldName}
                        recordId={activeRecordId}
                        entityKey={entityKey}
                        unifiedLayoutProps={unifiedLayoutProps}
                        onFieldChange={handleFieldChange}
                    />
                </div>
            );
        },
        [entityKey, activeRecordId, unifiedLayoutProps, handleFieldChange]
    );

    const getRelationshipFieldComponent = useCallback(
        (fieldName: EntityAnyFieldKey<TEntity>) => {
            const key = `${activeRecordId || instanceId.current}-${fieldName}`;
            
            return (
                <div key={key} className='w-full'>
                    <EntityRelationshipWrapperFinal
                        fieldName={fieldName}
                        recordId={activeRecordId}
                        entityKey={entityKey}
                        unifiedLayoutProps={unifiedLayoutProps}
                    />
                </div>
            );
        },
        [entityKey, activeRecordId, unifiedLayoutProps]
    );

    return useMemo(() => ({
        getNativeFieldComponent,
        getRelationshipFieldComponent
    }), [getNativeFieldComponent, getRelationshipFieldComponent]);
}