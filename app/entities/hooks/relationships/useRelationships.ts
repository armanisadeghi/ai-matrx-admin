import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useCallback, useMemo } from 'react';
import { RelationshipMapper } from './relationshipDefinitions';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useGetOrFetchRecord, useGetorFetchRecords } from '../records/useGetOrFetch';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import { useRelationshipCreate } from '../unsaved-records/useDirectCreate';
import { simpleRelDef } from './definitionConversionUtil';

export function useRelWithFetch(relDefSimple: simpleRelDef, anyParentId: MatrxRecordId | string | number) {
    const parentId = anyParentId ? (typeof anyParentId === 'string' && anyParentId.includes(':') ? toPkValue(anyParentId) : anyParentId.toString()) : undefined;

    const parentEntity = relDefSimple.parent.name;
    const joiningEntity = relDefSimple.join.name;
    const childEntity = relDefSimple.child.name;

    // Get selectors for all entities
    const parentSelectors = createEntitySelectors(parentEntity);
    const joinSelectors = createEntitySelectors(joiningEntity);
    const childSelectors = createEntitySelectors(childEntity);

    // Get loading states from each entity
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    const { deleteRecords, isDeleting } = useSequentialDelete(childEntity, joiningEntity);

    const parentRecordsWithKey = useGetOrFetchRecord({ entityName: parentEntity, simpleId: parentId });
    const parentMatrxid = parentRecordsWithKey?.matrxRecordId;
    const joinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joiningEntity);
        m.setParentEntity(parentEntity);
        m.setData(joinRecords);
        m.setParentId(parentId);
        return m;
    }, [joiningEntity, parentEntity, joinRecords, parentId]);

    const JoiningEntityRecords = mapper.getJoinRecords() as EntityDataWithKey<EntityKeys>[];
    const joiningMatrxIds = mapper.getJoinMatrxIds();
    const childIds = mapper.getChildMatrxIds();
    const childMatrxIds = mapper.getChildMatrxIds();
    const childRecords = useAppSelector((state) => childSelectors.selectRecordsWithKeys(state, childMatrxIds)) as EntityDataWithKey<EntityKeys>[];

    useGetorFetchRecords(childEntity, childMatrxIds) as EntityDataWithKey<EntityKeys>[];

    const deleteChildAndJoin = useCallback(
        (childRecordId: MatrxRecordId, onComplete?: (success: boolean) => void) => {
            if (!childMatrxIds.includes(childRecordId)) {
                onComplete?.(false);
                return;
            }
    
            const JoinRecordId = findSingleJoinRecordKeyForChild(JoiningEntityRecords, childRecordId, relDefSimple);
            if (JoinRecordId) {
                deleteRecords(childRecordId, JoinRecordId);
            } else {
                onComplete?.(false);
            }
        },
        [deleteRecords, JoiningEntityRecords, childMatrxIds, relDefSimple]
    );
    
    const createRelatedRecords = useRelationshipCreate(joiningEntity, childEntity, parentId);

    const isLoading = isParentLoading || isJoinLoading || isChildLoading;
    const loadingState = {
        parent: isParentLoading,
        join: isJoinLoading,
        child: isChildLoading,
        isDeleting: isDeleting,
    };

    return {
        mapper,
        JoiningEntityRecords,
        joiningMatrxIds,
        childIds,
        childMatrxIds,
        childRecords,
        parentMatrxid,
        parentId,
        deleteChildAndJoin,
        createRelatedRecords,
        isLoading,
        loadingState,
    };
}

export type RelationshipHook = ReturnType<typeof useRelWithFetch>;



export function findSingleJoinRecordKeyForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relDefSimple: simpleRelDef
): MatrxRecordId | undefined {
    const childField = relDefSimple.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecord = joinRecordsWithKey.find((record) => record[childField] === childId);
    if (!matchingRecord) {
        return undefined;
    }
    return matchingRecord.matrxRecordId;
}

export function filterAllJoinRecordKeysForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relDefSimple: simpleRelDef
): MatrxRecordId[] {
    const childField = relDefSimple.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecords = joinRecordsWithKey.filter((record) => record[childField] === childId);
    const recordKeys: MatrxRecordId[] = matchingRecords.map((record) => record.matrxRecordId);
    return recordKeys;
}

export function useJoinedActiveParent(relDef: simpleRelDef) {
    const selectors = createEntitySelectors(relDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);

    const relationshipHook = useRelWithFetch(relDef, activeParentId);

    return { activeParentMatrxId, activeParentId, relationshipHook };
}

export function useDoubleJoinedActiveParent(firstRelDef: simpleRelDef, secondRelDef: simpleRelDef) {
    const selectors = createEntitySelectors(firstRelDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);

    const firstRelHook = useRelWithFetch(firstRelDef, activeParentId);
    const secondRelHook = useRelWithFetch(secondRelDef, activeParentId);

    return { activeParentMatrxId, activeParentId, firstRelHook, secondRelHook };
}
