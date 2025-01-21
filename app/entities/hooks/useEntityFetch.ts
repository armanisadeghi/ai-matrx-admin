import * as React from 'react';
import { useEntityTools } from '@/lib/redux';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { entityDefaultSettings } from '@/lib/redux/entity/constants/defaults';
import { AllEntityFieldKeys, EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { toMatrxIdFromValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EnhancedRecord } from '@/lib/redux/entity/types/stateTypes';

interface QuickReferenceRecord {
    recordKey: MatrxRecordId;
    primaryKeyValues: Record<AllEntityFieldKeys, any>;
    displayValue: string;
}

export function useEntityFetch<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions, selectors, dispatch } = useEntityTools(entityKey);
    const isLoading = useAppSelector(selectors.selectIsLoading);
    const quickReferences = useAppSelector(selectors.selectQuickReference) as QuickReferenceRecord[];
    const isQuickRefFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const allFetchedFullRecords = useAppSelector(selectors.selectAllEffectiveRecordsWithKeys) as EntityDataWithKey<EntityKeys>[];

    React.useEffect(() => {
        if (!isLoading && !isQuickRefFetchComplete) {
            dispatch(
                actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
                })
            );
        }
    }, [dispatch, actions, isLoading, isQuickRefFetchComplete]);

    const fetchFullRecords = React.useCallback(
        (recordKeys: MatrxRecordId[]) => {
            return dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: recordKeys,
                    fetchMode: 'fkIfk',
                })
            );
        },
        [dispatch, actions]
    );

    const getOrFetchRecord = React.useCallback(
        async (recordKey: MatrxRecordId): Promise<EntityDataWithKey<EntityKeys> | undefined> => {
            const existingRecord = allFetchedFullRecords.find((record) => record.matrxRecordId === recordKey);

            if (existingRecord) {
                return Promise.resolve(existingRecord);
            }

            const quickRef = quickReferences.find((ref) => ref.recordKey === recordKey);

            if (!quickRef) {
                return undefined;
            }

            return new Promise((resolve, reject) => {
                fetchFullRecords([recordKey]);

                const timeoutId = setTimeout(() => {
                    reject(new Error(`Fetch timeout for record: ${recordKey}`));
                }, 30000);

                const checkForRecord = () => {
                    const record = allFetchedFullRecords.find((r) => r.matrxRecordId === recordKey);

                    if (record) {
                        clearTimeout(timeoutId);
                        resolve(record);
                    } else {
                        setTimeout(checkForRecord, 100);
                    }
                };

                checkForRecord();
            });
        },
        [allFetchedFullRecords, fetchFullRecords, quickReferences]
    );

    return React.useMemo(
        () => ({
            quickReferences,
            isLoading,
            fetchFullRecords,
            getOrFetchRecord,
        }),
        [quickReferences, isLoading, fetchFullRecords, getOrFetchRecord]
    );
}

type UseGetOrFetchRecordProps = {
    entityName: EntityKeys;
    matrxRecordId?: MatrxRecordId;
    simpleId?: string | number;
};

export function useEnhancedFetch<TEntity extends EntityKeys>(entityKey: TEntity) {
    const { actions, selectors, dispatch } = useEntityTools(entityKey);
    const isLoading = useAppSelector(selectors.selectIsLoading);
    const quickReferences = useAppSelector(selectors.selectQuickReference) as QuickReferenceRecord[];
    const isQuickRefFetchComplete = useAppSelector(selectors.selectIsQuickReferenceFetchComplete);
    const enhancedRecords = useAppSelector(selectors.selectEnhancedRecords) as EnhancedRecord[];

    React.useEffect(() => {
        if (!isLoading && !isQuickRefFetchComplete) {
            dispatch(
                actions.fetchQuickReference({
                    maxRecords: entityDefaultSettings.maxQuickReferenceRecords,
                })
            );
        }
    }, [dispatch, actions, isLoading, isQuickRefFetchComplete]);

    const fetchFullRecords = React.useCallback(
        (recordKeys: MatrxRecordId[]) => {
            return dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: recordKeys,
                    fetchMode: 'fkIfk',
                })
            );
        },
        [dispatch, actions]
    );

    const getOrFetchRecord  = React.useCallback(
        async (recordKey: MatrxRecordId) => {
            const record = enhancedRecords.find(r => r.recordKey === recordKey);
            
            if (record?.needsFetch) {
                dispatch(
                    actions.getOrFetchSelectedRecords({
                        matrxRecordIds: [recordKey],
                        fetchMode: 'fkIfk',
                    })
                );
            }
    
            return record || null;
        },
        [enhancedRecords, dispatch, actions]
    );

    return React.useMemo(
        () => ({
            quickReferences,
            isLoading,
            fetchFullRecords,
            getOrFetchRecord ,
            enhancedRecords,
        }),
        [quickReferences, isLoading, fetchFullRecords, getOrFetchRecord, enhancedRecords ]
    );
}
