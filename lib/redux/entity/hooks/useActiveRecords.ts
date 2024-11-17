import * as React from 'react';
import {EntityKeys, EntityData, PrettyEntityName} from '@/types/entityTypes';
import { useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { EntityState, EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';

export const useActiveRecords = () => {
    const entityOptions = useAppSelector(selectFormattedEntityOptions);
    const entitySelectors = React.useMemo(() => {
        return entityOptions.reduce((acc, { value: entityKey }) => {
            acc[entityKey] = createEntitySelectors(entityKey);
            return acc;
        }, {} as EntityState<EntityKeys>);
    }, [entityOptions]);

    // Subscribe to active records state across all entities
    const activeRecordsState = useAppSelector(state => {
        return entityOptions.reduce((acc, { value: entityKey, label: entityDisplayName }) => {
            const selectors = entitySelectors[entityKey];
            acc[entityKey] = {
                entityDisplayName: entityDisplayName,
                activeRecordId: selectors.selectActiveRecordId(state),
                activeRecord: selectors.selectActiveRecord(state),
                displayField: selectors.selectDisplayField(state),
                fieldInfo: selectors.selectFieldInfo(state)
            };
            return acc;
        }, {} as Record<EntityKeys, {
            activeRecordId: MatrxRecordId | null;
            activeRecord: EntityData<any> | null;
            entityDisplayName: PrettyEntityName<EntityKeys>;
            displayField: string;
            fieldInfo: EntityStateField[];
        }>);
    });

    // Find the current active entity and its data
    const activeEntity = React.useMemo(() => {
        for (const [entityKey, state] of Object.entries(activeRecordsState)) {
            if (state.activeRecordId && state.activeRecord) {
                return {
                    entityKey: entityKey as EntityKeys,
                    recordId: state.activeRecordId,
                    record: state.activeRecord,
                    entityDisplayName: state.entityDisplayName,
                    displayField: state.displayField,
                    fieldInfo: state.fieldInfo
                };
            }
        }
        return null;
    }, [activeRecordsState]);

    const fieldsWithValues = React.useMemo(() => {
        if (!activeEntity?.record || !activeEntity.fieldInfo) return [];

        return activeEntity.fieldInfo.map(field => ({
            ...field,
            value: activeEntity.record[field.name]
        }));
    }, [activeEntity]);

    return {
        // Active record state
        activeEntityKey: activeEntity?.entityKey ?? null,
        activeRecordId: activeEntity?.recordId ?? null,

        // Display metadata
        entityDisplayName: activeEntity?.entityDisplayName ?? '',
        displayField: activeEntity?.displayField ?? '',

        // Combined data
        fields: fieldsWithValues,

        // Raw data access
        rawRecord: activeEntity?.record ?? null,
        rawFieldInfo: activeEntity?.fieldInfo ?? [],

        // Helper function
        isRecordActive: React.useCallback((
            entityKey: EntityKeys,
            recordId: MatrxRecordId
        ): boolean => {
            return activeRecordsState[entityKey]?.activeRecordId === recordId;
        }, [activeRecordsState])
    };
};
