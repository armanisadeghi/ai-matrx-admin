import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from "@/types/entityTypes";
import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { RootState } from "@/lib/redux/store";

export function useOneRelationship(
    parentEntity: EntityKeys,
    childEntity: EntityKeys,
    parentReferenceField: EntityAnyFieldKey<EntityKeys>,
    childReferenceField: EntityAnyFieldKey<EntityKeys>
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

    const matchingChildRecords = useAppSelector((state: RootState) =>
        childSelectors.selectRecordsByFieldValue(state, childReferenceField, activeParentId)
    );

    const setActiveParent = useCallback(
        (recordKey: MatrxRecordId) => {
            dispatch(parentActions.fetchOneWithFkIfk({ matrxRecordId: recordKey }));
            dispatch(parentActions.setActiveRecord(recordKey));
        },
        [dispatch, parentActions]
    );

    return {
        parentRecords,
        parentRecordsArray,
        activeParentRecord,
        activeParentId,
        matchingChildRecords,
        setActiveParent,
        activeParentRecordKey,
    };
}

export type UseOneRelationshipReturn = ReturnType<typeof useOneRelationship>;
