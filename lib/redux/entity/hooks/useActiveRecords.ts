import * as React from 'react';
import {EntityKeys, EntityData, PrettyEntityName} from '@/types/entityTypes';
import { useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { EntityState, EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';

export const useActiveRecords = () => {
    const entityOptions = useAppSelector(selectFormattedEntityOptions);

    const entitySelectors = React.useMemo(() => {
        return entityOptions.reduce((acc, { value: entityKey }) => {
            acc[entityKey] = createEntitySelectors(entityKey);
            return acc;
        }, {} as Record<EntityKeys, ReturnType<typeof createEntitySelectors>>);
    }, [entityOptions]);

    const activeRecordsState = useAppSelector(state => {
        return entityOptions.reduce((acc, { value: entityKey, label: entityDisplayName }) => {
            const selectors = entitySelectors[entityKey];
            const activeRecordId = selectors.selectActiveRecordId(state);
            const activeRecord = selectors.selectActiveRecord(state);
            const displayField = selectors.selectDisplayField(state);
            const fieldInfo = selectors.selectFieldInfo(state);

            acc[entityKey] = {
                entityDisplayName,
                activeRecordId,
                activeRecord,
                displayField,
                fieldInfo,
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

    const activeEntity = React.useMemo(() => {
        for (const [entityKey, state] of Object.entries(activeRecordsState)) {
            if (state.activeRecordId && state.activeRecord) {
                return {
                    entityKey: entityKey as EntityKeys,
                    recordId: state.activeRecordId,
                    record: state.activeRecord,
                    entityDisplayName: state.entityDisplayName,
                    displayField: state.displayField,
                    fieldInfo: state.fieldInfo,
                };
            }
        }
        return null;
    }, [activeRecordsState]);

    const fieldsWithValues = React.useMemo(() => {
        if (!activeEntity?.record || !activeEntity.fieldInfo) return [];

        return activeEntity.fieldInfo.map(field => ({
            ...field,
            value: activeEntity.record[field.name],
        }));
    }, [activeEntity]);

    const isRecordActive = React.useCallback(
        (entityKey: EntityKeys, recordId: MatrxRecordId): boolean => {
            return activeRecordsState[entityKey]?.activeRecordId === recordId;
        },
        [activeRecordsState]
    );

    return {
        activeEntityKey: activeEntity?.entityKey ?? null,
        activeRecordId: activeEntity?.recordId ?? null,
        entityDisplayName: activeEntity?.entityDisplayName ?? '',
        displayField: activeEntity?.displayField ?? '',
        fields: fieldsWithValues,
        rawRecord: activeEntity?.record ?? null,
        rawFieldInfo: activeEntity?.fieldInfo ?? [],
        isRecordActive,
    };
};
