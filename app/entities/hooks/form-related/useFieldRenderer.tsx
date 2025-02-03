'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import EntityBaseFieldFinal from '@/app/entities/fields/EntityBaseFieldFinal';
import EntityRelationshipWrapperFinal from '@/app/entities/relationships/EntityRelationshipWrapperFinal';
import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from '@/types/entityTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { useAppDispatch, useEntityTools } from '@/lib/redux';

export interface FieldRendererOptions {
    onFieldChange?: (fieldName: string, value: unknown) => void;
    forceEnable?: boolean;
}

export function useFieldRenderer<TEntity extends EntityKeys>(
    entityKey: TEntity | null,
    activeRecordId: MatrxRecordId | null,
    unifiedLayoutProps: UnifiedLayoutProps,
    options?: FieldRendererOptions
) {

    const dispatch = useAppDispatch();
    const actions = useEntityTools(entityKey).actions;
    const instanceId = useRef(Math.random().toString(36).slice(2, 9));

    useEffect(() => {
        if (options?.forceEnable) {
            dispatch(actions.startRecordUpdateById(activeRecordId));
        }
    }, [options?.forceEnable]);


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
                        forceEnable={options?.forceEnable}
                    />
                </div>
            );
        },
        [entityKey, activeRecordId, unifiedLayoutProps, handleFieldChange, options?.forceEnable]
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