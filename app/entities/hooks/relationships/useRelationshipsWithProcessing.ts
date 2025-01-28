import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useCallback } from 'react';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import { getStandardRelationship, KnownRelDef, SimpleRelDef } from './definitionConversionUtil';
import _ from 'lodash';
import { useRelationshipDirectCreate } from '../crud/useDirectRelCreate';
import { useStableRelationships } from './new/useStableRelationships';

export function useRelFetchProcessing(relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) {
    const {
        // Entity names
        parentEntity,
        joiningEntity,
        childEntity,

        // Entity tools
        parentTools,
        joinTools,
        childTools,

        // Parent data
        parentId,
        parentRecords,
        parentMatrxid,

        // Join/Relationship data
        joinIds,
        joinRecords,
        joiningMatrxIds,

        // Child data
        childIds,
        childMatrxIds,
        unprocessedChildRecords,
        childRecords,

        // Loading state
        isChildLoading,
        isJoinLoading,

        triggerProcessing,
    } = useStableRelationships(relDefSimple, anyParentId);


    const isLoading = isJoinLoading || isChildLoading;



    const { deleteRecords, isDeleting } = useSequentialDelete(childEntity, joiningEntity);

    const deleteChildAndJoin = useCallback(
        (childRecordId: MatrxRecordId) => {
            if (!childMatrxIds.includes(childRecordId)) {
                return;
            }

            const JoinRecordId = findSingleJoinRecordKeyForChild(joinRecords, childRecordId, relDefSimple);
            if (JoinRecordId) {
                deleteRecords(childRecordId, JoinRecordId);
            }
        },
        [deleteRecords, joinRecords, childMatrxIds, relDefSimple]
    );

    const createRelatedRecords = useRelationshipDirectCreate(joiningEntity, childEntity, parentId);

    const loadingState = {
        isLoading,
        isJoinLoading,
        isDeleting,
        isChildLoading,
    };

    return {
        // Entity names
        parentEntity,
        joiningEntity,
        childEntity,

        // Entity tools
        parentTools,
        joinTools,
        childTools,

        // Parent data
        parentId,
        parentRecords,
        parentMatrxid,

        // Join/Relationship data
        joinIds,
        joinRecords,
        joiningMatrxIds,

        // Child data
        childIds,
        childMatrxIds,
        unprocessedChildRecords,
        childRecords,

        // Loading state
        isLoading,
        loadingState,

        deleteChildAndJoin,
        createRelatedRecords,
        triggerProcessing,
    };
}

export type RelationshipProcessingHook = ReturnType<typeof useRelFetchProcessing>;

export function findSingleJoinRecordKeyForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relDefSimple: SimpleRelDef
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
    relDefSimple: SimpleRelDef
): MatrxRecordId[] {
    const childField = relDefSimple.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecords = joinRecordsWithKey.filter((record) => record[childField] === childId);
    const recordKeys: MatrxRecordId[] = matchingRecords.map((record) => record.matrxRecordId);
    return recordKeys;
}

export function useJoinedActiveParentProcessing(relDef: SimpleRelDef) {
    const selectors = createEntitySelectors(relDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);

    const relationshipHook = useRelFetchProcessing(relDef, activeParentId);

    return { activeParentMatrxId, activeParentId, relationshipHook };
}

export type JoinedActiveParentProcessingHook = ReturnType<typeof useJoinedActiveParentProcessing>;

export function useDoubleJoinedActiveParentProcessing(firstRelKey: KnownRelDef, secondRelKey: KnownRelDef) {
    const firstRelDef = getStandardRelationship(firstRelKey);
    const secondRelDef = getStandardRelationship(secondRelKey);
    const selectors = createEntitySelectors(firstRelDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);
    
    const firstRelHook = useRelFetchProcessing(firstRelDef, activeParentId);
    const secondRelHook = useRelFetchProcessing(secondRelDef, activeParentId);

    return { activeParentMatrxId, activeParentId, firstRelHook, secondRelHook };
}

export type DoubleJoinedActiveParentProcessingHook = ReturnType<typeof useDoubleJoinedActiveParentProcessing>;

export function useDoubleStableRelationships(firstRelKey: KnownRelDef, secondRelKey: KnownRelDef, anyParentId: MatrxRecordId | string | number) {
    const firstRelDef = getStandardRelationship(firstRelKey);
    const secondRelDef = getStandardRelationship(secondRelKey);
    const selectors = createEntitySelectors(firstRelDef.parent.name);
    
    const firstRelHook = useRelFetchProcessing(firstRelDef, anyParentId);
    const secondRelHook = useRelFetchProcessing(secondRelDef, anyParentId);

    return { firstRelHook, secondRelHook };
}

export type UseDoubleStableRelationshipHook = ReturnType<typeof useDoubleJoinedActiveParentProcessing>;
