import React, { useCallback, useMemo, useRef } from 'react';
import EntityBaseFieldFinal from '@/app/entities/fields/EntityBaseFieldFinal';
import EntityRelationshipWrapperFinal from '@/app/entities/relationships/EntityRelationshipWrapperFinal';
import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from '@/types/entityTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

export function useFieldRenderer<TEntity extends EntityKeys>(
    entityKey: TEntity | null,
    activeRecordId: MatrxRecordId | null,
    unifiedLayoutProps: UnifiedLayoutProps
) {
    // Create a stable instance ID for this component instance
    const instanceId = useRef(Math.random().toString(36).slice(2, 9));

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
                    />
                </div>
            );
        },
        [entityKey, activeRecordId, unifiedLayoutProps]
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