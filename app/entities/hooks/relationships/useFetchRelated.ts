import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { EntityKeys } from '@/types/entityTypes';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { Callback, callbackManager } from '@/utils/callbackManager';
import * as React from 'react';
import { useEntityTools } from '@/lib/redux';

interface useFetchRelatedFinalParams {
    parentEntity: EntityKeys;
    activeEntityRecordId?: MatrxRecordId;
    activeEntityKey?: EntityKeys;
    fieldValue?: any;
}

export function useFetchRelatedWithM2m({ parentEntity, fieldValue }: useFetchRelatedFinalParams) {
    const dispatch = useAppDispatch();
    const { store, actions: parentActions, selectors: parentSelectors } = useEntityTools(parentEntity);

    const matrxRecordId: MatrxRecordId = useAppSelector((state) => (fieldValue ? parentSelectors.selectMatrxRecordIdFromValue(state, fieldValue) : null));

    const fetchOne = useCallback(
        (recordId: MatrxRecordId, callback?: Callback) => {
            if (callback) {
                const callbackId = callbackManager.register(callback);
                dispatch(
                    parentActions.fetchOne({
                        matrxRecordId: recordId,
                        callbackId,
                    })
                );
            } else {
                dispatch(
                    parentActions.fetchOne({
                        matrxRecordId: recordId,
                    })
                );
            }
        },
        [dispatch, parentActions]
    );

    const { records, fieldInfo: individualFieldInfo, displayField } = useAppSelector(parentSelectors.selectCombinedRecordsWithFieldInfo);

    const { hasRecords, recordCount } = React.useMemo(() => {
        const count = Object.keys(records).length;
        return {
            hasRecords: count > 0,
            recordCount: count,
        };
    }, [records]);

    React.useEffect(() => {
        if (matrxRecordId) {
            const existingRecord = records[matrxRecordId];
            if (!existingRecord) {
                fetchOne(matrxRecordId);
                console.log(' useEffect Fetching One using matrxRecordId: ', matrxRecordId);
            }
        }
    }, [parentEntity, matrxRecordId, fetchOne, records]);

    return {
        records,
        displayField,
        matrxRecordId,
        individualFieldInfo,
        hasRecords,
        recordCount,
    };
}
