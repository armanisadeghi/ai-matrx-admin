import { EntityKeys, MatrxRecordId } from '@/types';
import { useMemo } from 'react';
import { useAppStore } from '../../hooks';
import { createEntitySelectors } from '../selectors';
import { createRecordKey, parseRecordKey } from '../utils/stateHelpUtils';

export const useEntityKeys = ({
    entityKey,
    recordId,
    primaryKeyValues,
}: {
    entityKey: EntityKeys;
    recordId?: MatrxRecordId;
    primaryKeyValues?: Record<string, unknown>;
}) => {
    const store = useAppStore();
    const selectors = createEntitySelectors(entityKey);
    const metadata = selectors.selectPrimaryKeyMetadata(store.getState());

    return useMemo(() => {
        if (recordId) {
            return { recordId, primaryKeyValues: parseRecordKey(recordId) };
        }

        if (primaryKeyValues) {
            return { recordId: createRecordKey(metadata, primaryKeyValues), primaryKeyValues };
        }

        return { recordId: undefined, primaryKeyValues: undefined };
    }, [recordId, primaryKeyValues, metadata]);
};

export const usePkToRecordId = (entityKey: EntityKeys, primaryKeyValues: Record<string, unknown>) => {
    const { recordId } = useEntityKeys({ entityKey, primaryKeyValues });
    return recordId;
};

export const useRecordIdToPks = (entityKey: EntityKeys, recordId: MatrxRecordId) => {
    const { primaryKeyValues } = useEntityKeys({ entityKey, recordId });
    return primaryKeyValues;
};

export const useEntityKeysBatch = ({
    entityKey,
    recordIdList,
    primaryKeyValuesList,
}: {
    entityKey: EntityKeys;
    recordIdList?: MatrxRecordId[];
    primaryKeyValuesList?: Record<string, unknown>[];
}) => {
    const store = useAppStore();
    const selectors = createEntitySelectors(entityKey);
    const metadata = selectors.selectPrimaryKeyMetadata(store.getState());

    return useMemo(() => {
        if (recordIdList) {
            return {
                recordIdList,
                primaryKeyValuesList: recordIdList.map((id) => parseRecordKey(id)),
            };
        }

        if (primaryKeyValuesList) {
            return {
                recordIdList: primaryKeyValuesList.map((pkValues) => createRecordKey(metadata, pkValues)),
                primaryKeyValuesList,
            };
        }

        return { recordIdList: [], primaryKeyValuesList: [] };
    }, [recordIdList, primaryKeyValuesList, metadata]);
};

export const usePkToRecordIdBatch = (
    entityKey: EntityKeys,
    primaryKeyValuesList: Record<string, unknown>[]
) => {
    const { recordIdList } = useEntityKeysBatch({ entityKey, primaryKeyValuesList });
    return recordIdList;
};

export const useRecordIdToPksBatch = (entityKey: EntityKeys, recordIdList: MatrxRecordId[]) => {
    const { primaryKeyValuesList } = useEntityKeysBatch({ entityKey, recordIdList });
    return primaryKeyValuesList;
};
