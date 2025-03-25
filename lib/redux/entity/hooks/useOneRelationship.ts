import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from "@/types/entityTypes";
import { useEffect, useCallback, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { RootState } from "@/lib/redux/store";
import { FetchRecordsPayload, SortPayload } from "../actions";
import { FilterCondition } from "../types/stateTypes";

const DEBUG = false;

export interface UseOneRelationshipParams {
    parentEntity: EntityKeys;
    childEntity: EntityKeys;
    parentReferenceField: EntityAnyFieldKey<EntityKeys>;
    childReferenceField: EntityAnyFieldKey<EntityKeys>;
    additionalFilters?: FilterCondition[];
    sort?: SortPayload; 
    maxCount?: number;
}

export function useOneRelationship(params: UseOneRelationshipParams) {
    const { parentEntity, childEntity, parentReferenceField, childReferenceField, additionalFilters, sort, maxCount } = params;
    const [fetchCompleted, setFetchCompleted] = useState(false);

    const dispatch = useAppDispatch();
    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);

    useEffect(() => {
        dispatch(parentActions.fetchAll({}));
    }, []);

    const parentRecords = useAppSelector(parentSelectors.selectAllRecords);
    const parentRecordsArray = useAppSelector(parentSelectors.selectRecordsArray);
    const hasRecords = useAppSelector(parentSelectors.selectHasMinimumOneRecord);

    useEffect(() => {
        if (hasRecords) {
            setFetchCompleted(true);
        }
    }, [hasRecords]);

    const activeParentRecord = useAppSelector(parentSelectors.selectActiveRecord);
    const activeParentId = activeParentRecord?.[parentReferenceField];
    const activeParentRecordKey = useAppSelector(parentSelectors.selectActiveRecordId);
    const parentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isParentLoading = parentLoading || !fetchCompleted;    
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    const matchingChildRecords = useAppSelector((state: RootState) =>
        childSelectors.selectRecordsByFieldValue(state, childReferenceField, activeParentId)
    );

    const matchingChildRecordsCount = useAppSelector((state: RootState) =>
        childSelectors.selectRecordCountByFieldValue(state, childReferenceField, activeParentId)
    );

    const isRelationshipLoading = useRef(isParentLoading || isChildLoading);

    useEffect(() => {
        isRelationshipLoading.current = isParentLoading || isChildLoading;
    }, [isParentLoading, isChildLoading]);

    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isRelationshipLoading.current) {
                resolve();
                return;
            }
    
            let iterationCount = 0;
            const unsubscribe = setInterval(() => {
                iterationCount++;
    
                if (iterationCount % 10 === 0) {
                    console.warn(`waitForLoading still running after ${iterationCount} checks (${iterationCount * 100}ms)`);
                }
    
                if (!isRelationshipLoading.current) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100);
        });
    }, [isParentLoading, isChildLoading]);

    
    const setActiveParent = useCallback(
        async (recordKey: MatrxRecordId) => {
            const isPermanentKey = recordKey.startsWith("id:")
            const isTempkey = recordKey.startsWith("new-record-");

            if (isPermanentKey) {
                dispatch(parentActions.fetchOneWithFkIfk({ matrxRecordId: recordKey }));
                await waitForLoading();
                console.log("⚠️ useOneRelationship: Setting active parent to a permanent record, but not fetching anything.", recordKey);
                dispatch(parentActions.setActiveRecord(recordKey));
            } else if (isTempkey) {
                console.log("⚠️ useOneRelationship: Setting active parent to a temporary record, but not fetching anything.", recordKey);
                await waitForLoading();
                dispatch(parentActions.setActiveRecord(recordKey));
            } else {
                dispatch(parentActions.setActiveRecord(recordKey));
                console.warn("useOneRelationship: The record key used is not a valid key. Please check.", recordKey);
            }
        },
        [dispatch, parentActions, waitForLoading]
    );

    const refetchChildRecords = useCallback(() => {
        if (!activeParentId) return;

        const payload: FetchRecordsPayload = {
            page: 1,
            pageSize: maxCount,
            options: {
                filters: {
                    conditions: [
                        {
                            field: childReferenceField,
                            operator: "eq",
                            value: activeParentId,
                        },
                        ...additionalFilters,
                    ],
                    replace: true,
                },
                ...(sort ? { sort } : {}),
            },
        };

        dispatch(childActions.fetchRecords(payload));
    }, [activeParentId, additionalFilters, sort]);


    useEffect(() => {        if (DEBUG) {
            console.log("🔄 useOneRelationship 🔄");
            console.log("- parentLoading:", parentLoading);
            console.log("- fetchCompleted:", fetchCompleted);
            console.log("- isParentLoading:", isParentLoading);
            console.log("- isChildLoading:", isChildLoading);
            console.log("- isRelationshipLoading:", isRelationshipLoading);
            console.log("- activeParentRecord:", activeParentRecord);
            console.log("- activeParentId:", activeParentId);
            console.log("- activeParentRecordKey:", activeParentRecordKey);
            console.log("- hasRecords:", hasRecords);
            console.log("- matchingChildRecords:", matchingChildRecords);
            console.log("- matchingChildRecordsCount:", matchingChildRecordsCount);
            console.log("🔄 ========================== 🔄");

        }
    }, [
        isParentLoading,
        isChildLoading,
        isRelationshipLoading,
        fetchCompleted,
        activeParentRecord,
        activeParentId,
        activeParentRecordKey,
        parentRecords,
        parentRecordsArray,
        hasRecords,
        matchingChildRecords,
        matchingChildRecordsCount,
    ]);



    return {
        parentRecords,
        parentRecordsArray,
        activeParentRecord,
        activeParentId,
        matchingChildRecords,
        matchingChildRecordsCount,
        setActiveParent,
        activeParentRecordKey,
        parentSelectors,
        childSelectors,
        parentActions,
        refetchChildRecords,
        isParentLoading,
        isChildLoading,
        isRelationshipLoading,
        fetchCompleted,
    };
}

export type UseOneRelationshipReturn = ReturnType<typeof useOneRelationship>;