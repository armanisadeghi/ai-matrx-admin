import { EntityKeys, EntityAnyFieldKey, MatrxRecordId } from "@/types/entityTypes";
import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useEntityTools } from "./coreHooks";
import { RootState } from "../../store";

export function useOneRelationship(parentEntity: EntityKeys, childEntity: EntityKeys, parentReferenceField: EntityAnyFieldKey<EntityKeys>, childReferenceField: EntityAnyFieldKey<EntityKeys>) {
    const dispatch = useAppDispatch();
    const {selectors: parentSelectors, actions: parentActions} = useEntityTools(parentEntity);
    const {selectors: childSelectors, actions: childActions} = useEntityTools(childEntity);

    useEffect(() => {
        dispatch(parentActions.fetchAll({}));
    }, []);

    const parentRecords = useAppSelector(parentSelectors.selectRecordsArray);
    const activeParentRecord = useAppSelector(parentSelectors.selectActiveRecord);
    const activeParentId = activeParentRecord?.[parentReferenceField];

    const matchingChildRecords = useAppSelector((state: RootState) => childSelectors.selectRecordsByFieldValue(state, childReferenceField, activeParentId));

    const setActiveParent = useCallback((recordKey: MatrxRecordId) => {
        dispatch(parentActions.setActiveRecord(recordKey));
    }, [dispatch, parentActions]);



    return {
        parentRecords,
        activeParentRecord,
        activeParentId,
        matchingChildRecords,
        setActiveParent,
    }
}
    
export type UseOneRelationshipReturn = ReturnType<typeof useOneRelationship>;