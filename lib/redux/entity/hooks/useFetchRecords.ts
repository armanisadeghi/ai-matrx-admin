import * as React from 'react';
import {EntityKeys, EntityData, PrettyEntityName} from '@/types/entityTypes';
import {useAppSelector, useAppDispatch} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {EntityState, EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {Callback, callbackManager} from "@/utils/callbackManager";
import {FlexibleQueryOptions} from "@/lib/redux/entity/sagaHelpers";

interface FetchRecordsOptions {
    entityKey: EntityKeys;
    recordIds: MatrxRecordId[];
    onComplete?: (records: EntityData<any>[]) => void;
    onError?: (error: Error) => void;
}

interface FetchStateEntry {
    entityKey: EntityKeys;
    recordIds: MatrxRecordId[];
    callbackId?: string;
    errorCallbackId?: string;
    timestamp: number;
}

export const useFetchRecords = () => {
    const dispatch = useAppDispatch();
    const entityOptions = useAppSelector(selectFormattedEntityOptions);
    const entitySelectors = React.useMemo(() => {
        return entityOptions.reduce((acc, {value: entityKey}) => {
            acc[entityKey] = createEntitySelectors(entityKey);
            return acc;
        }, {} as EntityState<EntityKeys>);
    }, [entityOptions]);

    const [fetchState, setFetchState] = React.useState<Record<string, FetchStateEntry>>({});

    // Similar structure to activeRecordsState
    const fetchedRecordsState = useAppSelector(state => {
        return Object.entries(fetchState).reduce((acc, [fetchId, {entityKey, recordIds}]) => {
            const selectors = entitySelectors[entityKey];
            acc[fetchId] = {
                entityDisplayName: selectors.selectEntityDisplayName(state),
                recordIds,
                records: recordIds
                    .map(id => selectors.selectRecordById(state, id))
                    .filter((record): record is EntityData<any> => record !== null),
                displayField: selectors.selectDisplayField(state),
                fieldInfo: selectors.selectFieldInfo(state)
            };
            return acc;
        }, {} as Record<string, {
            entityDisplayName: PrettyEntityName<EntityKeys>;
            recordIds: MatrxRecordId[];
            records: EntityData<any>[];
            displayField: string;
            fieldInfo: EntityStateField[];
        }>);
    });

    // Process fields with values, matching the same structure
    const fieldsWithValuesByRecord = React.useMemo(() => {
        return Object.entries(fetchedRecordsState).reduce((acc, [fetchId, state]) => {
            acc[fetchId] = state.records.map(record =>
                state.fieldInfo.map(field => ({
                    ...field,
                    value: record[field.name]
                }))
            );
            return acc;
        }, {} as Record<string, EntityStateField[][]>);
    }, [fetchedRecordsState]);

    const fetchRecords = React.useCallback((
        {
            entityKey,
            recordIds,
            onComplete,
            onError
        }: FetchRecordsOptions) => {
        const fetchId = `${entityKey}-${recordIds.sort().join('-')}`;
        const callbackId = onComplete ? callbackManager.register(onComplete) : undefined;
        const errorCallbackId = onError ? callbackManager.register(onError) : undefined;

        setFetchState(prev => ({
            ...prev,
            [fetchId]: {
                entityKey,
                recordIds,
                callbackId,
                errorCallbackId,
                timestamp: Date.now()
            }
        }));

        dispatch({
            type: 'fetchSelectedRecords',
            payload: {
                entityNameAnyFormat: entityKey,
                recordKeys: recordIds,
                callbackId,
                errorCallbackId
            } as FlexibleQueryOptions
        });

        return () => {
            if (callbackId) callbackManager.remove(callbackId);
            if (errorCallbackId) callbackManager.remove(errorCallbackId);
            clearFetch(fetchId);
        };
    }, [dispatch]);

    const clearFetch = React.useCallback((fetchId: string) => {
        setFetchState(prev => {
            const {[fetchId]: _, ...rest} = prev;
            return rest;
        });
    }, []);

    React.useEffect(() => {
        return () => {
            Object.entries(fetchState).forEach(([fetchId, {callbackId, errorCallbackId}]) => {
                if (callbackId) callbackManager.remove(callbackId);
                if (errorCallbackId) callbackManager.remove(errorCallbackId);
                clearFetch(fetchId);
            });
        };
    }, [fetchState, clearFetch]);

    return {
        // Fetch function
        fetchRecords,

        // For a specific fetch, get the same structure as useActiveRecords
        getFetchedRecords: React.useCallback((
            entityKey: EntityKeys,
            recordIds: MatrxRecordId[]
        ) => {
            const fetchId = `${entityKey}-${recordIds.sort().join('-')}`;
            const state = fetchedRecordsState[fetchId];

            if (!state) return null;

            return {
                // Record state
                entityKey,
                recordIds: state.recordIds,
                records: state.records,

                // Display metadata (same as useActiveRecords)
                entityDisplayName: state.entityDisplayName,
                displayField: state.displayField,

                // Combined data (same structure as useActiveRecords)
                fields: fieldsWithValuesByRecord[fetchId],

                // Raw data access (same as useActiveRecords)
                rawRecords: state.records,
                rawFieldInfo: state.fieldInfo
            };
        }, [fetchedRecordsState, fieldsWithValuesByRecord]),

        // Raw state access (similar to useActiveRecords)
        rawFetchedRecordsState: fetchedRecordsState,

        // Cleanup
        clearFetch: React.useCallback((
            entityKey: EntityKeys,
            recordIds: MatrxRecordId[]
        ) => {
            const fetchId = `${entityKey}-${recordIds.sort().join('-')}`;
            clearFetch(fetchId);
        }, [clearFetch])
    };
};
