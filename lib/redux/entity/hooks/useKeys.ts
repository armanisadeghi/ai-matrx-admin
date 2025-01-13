import { EntityKeys, MatrxRecordId } from "@/types";
import { useMemo } from "react";
import { useAppStore } from "../../hooks";
import { createEntitySelectors } from "../selectors";
import { createRecordKey, parseRecordKey } from "../utils/stateHelpUtils";

type EntityKeysInput = {
    entityKey: EntityKeys;
    recordId?: MatrxRecordId;
    primaryKeyValues?: Record<string, unknown>;
    primaryKeyValue?: string;
};

export const useEntityKeys = ({ entityKey, recordId, primaryKeyValues, primaryKeyValue }: EntityKeysInput) => {
    const store = useAppStore();
    const selectors = createEntitySelectors(entityKey);
    const metadata = selectors.selectPrimaryKeyMetadata(store.getState());

    return useMemo(() => {
        if (primaryKeyValue) {
            // Convert single value to primaryKeyValues format
            const pkValues = { [metadata.fields[0]]: primaryKeyValue };
            const rid = createRecordKey(metadata, pkValues);
            return { recordId: rid, primaryKeyValues: pkValues, primaryKeyValue };
        }

        if (recordId) {
            const pkValues = parseRecordKey(recordId);
            const pkValue = pkValues[metadata.fields[0]] as string;
            return { recordId, primaryKeyValues: pkValues, primaryKeyValue: pkValue };
        }

        if (primaryKeyValues) {
            const rid = createRecordKey(metadata, primaryKeyValues);
            const pkValue = primaryKeyValues[metadata.fields[0]] as string;
            return { recordId: rid, primaryKeyValues, primaryKeyValue: pkValue };
        }

        return { recordId: undefined, primaryKeyValues: undefined, primaryKeyValue: undefined };
    }, [recordId, primaryKeyValues, primaryKeyValue, metadata]);
};

export const usePkToRecordId = (entityKey: EntityKeys, primaryKeyValue: string) => {
    const { recordId } = useEntityKeys({ entityKey, primaryKeyValue });
    return recordId;
};

export const useRecordIdToPk = (entityKey: EntityKeys, recordId: MatrxRecordId) => {
    const { primaryKeyValue } = useEntityKeys({ entityKey, recordId });
    return primaryKeyValue;
};

export const usePksToRecordIds = (entityKey: EntityKeys, primaryKeyValues: string[]) => {
    const results = useMemo(() => {
        return primaryKeyValues.map((pkValue) => {
            const { recordId } = useEntityKeys({ entityKey, primaryKeyValue: pkValue });
            return recordId;
        });
    }, [entityKey, primaryKeyValues]);

    return results;
};

export const useRecordIdsToPks = (entityKey: EntityKeys, recordIds: MatrxRecordId[]) => {
    const results = useMemo(() => {
        return recordIds.map((rid) => {
            const { primaryKeyValue } = useEntityKeys({ entityKey, recordId: rid });
            return primaryKeyValue;
        });
    }, [entityKey, recordIds]);

    return results;
};

type EntityKeysBatchInput = {
    entityKey: EntityKeys;
    recordIdList?: MatrxRecordId[];
    primaryKeyValuesList?: Record<string, unknown>[];
    primaryKeyValueList?: string[];
};

export const useEntityKeysBatch = ({ 
    entityKey,
    recordIdList,
    primaryKeyValuesList,
    primaryKeyValueList 
}: EntityKeysBatchInput) => {
    const store = useAppStore();
    const selectors = createEntitySelectors(entityKey);
    const metadata = selectors.selectPrimaryKeyMetadata(store.getState());

    return useMemo(() => {
        if (primaryKeyValueList) {
            // Convert array of single values to arrays of other formats
            const pkValuesList = primaryKeyValueList.map(value => ({ 
                [metadata.fields[0]]: value 
            }));
            const recordIds = pkValuesList.map(pkv => createRecordKey(metadata, pkv));
            return { 
                recordIdList: recordIds, 
                primaryKeyValuesList: pkValuesList, 
                primaryKeyValueList 
            };
        }

        if (recordIdList) {
            const pkValuesList = recordIdList.map(rid => parseRecordKey(rid));
            const pkValues = pkValuesList.map(pkv => pkv[metadata.fields[0]] as string);
            return { 
                recordIdList, 
                primaryKeyValuesList: pkValuesList, 
                primaryKeyValueList: pkValues 
            };
        }

        if (primaryKeyValuesList) {
            const recordIds = primaryKeyValuesList.map(pkv => createRecordKey(metadata, pkv));
            const pkValues = primaryKeyValuesList.map(pkv => pkv[metadata.fields[0]] as string);
            return { 
                recordIdList: recordIds, 
                primaryKeyValuesList, 
                primaryKeyValueList: pkValues 
            };
        }

        return { 
            recordIdList: undefined, 
            primaryKeyValuesList: undefined, 
            primaryKeyValueList: undefined 
        };
    }, [recordIdList, primaryKeyValuesList, primaryKeyValueList, metadata]);
};

export const useBatchPksToRecordIds = (entityKey: EntityKeys, primaryKeyValueList: string[]) => {
    const { recordIdList } = useEntityKeysBatch({ entityKey, primaryKeyValueList });
    return recordIdList;
};

export const useBatchRecordIdsToPks = (entityKey: EntityKeys, recordIdList: MatrxRecordId[]) => {
    const { primaryKeyValueList } = useEntityKeysBatch({ entityKey, recordIdList });
    return primaryKeyValueList;
};

export const useBatchPkValuesToRecordIds = (
    entityKey: EntityKeys,
    primaryKeyValuesList: Record<string, unknown>[]
) => {
    const { recordIdList } = useEntityKeysBatch({ entityKey, primaryKeyValuesList });
    return recordIdList;
};

export const useBatchRecordIdsToPkValues = (
    entityKey: EntityKeys,
    recordIdList: MatrxRecordId[]
) => {
    const { primaryKeyValuesList } = useEntityKeysBatch({ entityKey, recordIdList });
    return primaryKeyValuesList;
};
