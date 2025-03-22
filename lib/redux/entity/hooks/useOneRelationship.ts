import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from "@/types/entityTypes";
import { useEffect, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { RootState } from "@/lib/redux/store";
import { FetchRecordsPayload, SortPayload } from "../actions";
import { FilterCondition } from "../types/stateTypes";

const DEBUG = false;

export function useOneRelationship(
    parentEntity: EntityKeys,
    childEntity: EntityKeys,
    parentReferenceField: EntityAnyFieldKey<EntityKeys>,
    childReferenceField: EntityAnyFieldKey<EntityKeys>,
    additionalFilters?: FilterCondition[],
    sort?: SortPayload,
    maxCount: number = 100
) {
    const dispatch = useAppDispatch();
    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);

    useEffect(() => {
        dispatch(parentActions.fetchAll({}));
    }, []);

    const parentRecords = useAppSelector(parentSelectors.selectAllRecords);
    const parentRecordsArray = useAppSelector(parentSelectors.selectRecordsArray);
    const activeParentRecord = useAppSelector(parentSelectors.selectActiveRecord);
    const activeParentId = activeParentRecord?.[parentReferenceField];
    const activeParentRecordKey = useAppSelector(parentSelectors.selectActiveRecordId);
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    if (DEBUG) {
        console.log("useOneRelationship activeParentId", activeParentId);
        console.log("useOneRelationship activeParentRecord", activeParentRecord);
    }

    const matchingChildRecords = useAppSelector((state: RootState) =>
        childSelectors.selectRecordsByFieldValue(state, childReferenceField, activeParentId)
    );

    // Helper function to wait until isParentLoading is false
    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isParentLoading) {
                resolve();
                return;
            }
            const unsubscribe = setInterval(() => {
                if (!isParentLoading) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100); // Check every 100ms
        });
    }, [isParentLoading]);

    const setActiveParent = useCallback(
        async (recordKey: MatrxRecordId) => {
            const isKey = recordKey.startsWith("id:") || recordKey.startsWith("new-record-");
            if (!recordKey.startsWith("new-record-")) {
                dispatch(parentActions.fetchOneWithFkIfk({ matrxRecordId: recordKey }));
            } else if (!isKey) {
                console.warn("useOneRelationship: The record key used may or may not be valid. Please check.", recordKey);
            }

            // Wait for loading to complete if isParentLoading is true
            await waitForLoading();

            // Proceed with setting the active record
            dispatch(parentActions.setActiveRecord(recordKey));
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

    return {
        parentRecords,
        parentRecordsArray,
        activeParentRecord,
        activeParentId,
        matchingChildRecords,
        setActiveParent,
        activeParentRecordKey,
        parentSelectors,
        childSelectors,
        parentActions,
        refetchChildRecords,
        isParentLoading,
        isChildLoading,
    };
}

export type UseOneRelationshipReturn = ReturnType<typeof useOneRelationship>;