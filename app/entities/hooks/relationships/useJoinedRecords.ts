'use client';

import { createEntitySelectors, GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityData, EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useCallback, useEffect } from 'react';
import { RelationshipDefinition, createRelationshipData, filterJoinForChild } from './utils';
import React from 'react';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import useUnsavedJoinedWithParent from '../unsaved-records/useUnsavedJoinedWithParent';
import { toMatrxId, toPkValues, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useParentRelationship, useRelationshipMapper } from './useRelationshipMapper';

export function useJoinedRecords(relationshipDefinition: RelationshipDefinition, parentId: string) {
    const dispatch = useAppDispatch();

    const parentEntity = relationshipDefinition.parentEntity.entityKey;
    const joiningEntity = relationshipDefinition.joiningEntity.entityKey;

    const { JoiningEntityRecords, joiningMatrxIds, childIds, childMatrxIds, parentMatrxid } = useParentRelationship(joiningEntity, parentEntity, parentId);

    const parentReferencedField = relationshipDefinition.parentEntity.referenceField;
    const parentRecordId = toMatrxId(parentEntity, { [parentReferencedField]: parentId });
    const childEntity = relationshipDefinition.childEntity.entityKey;

    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);
    const { selectors: joiningSelectors, actions: joiningActions } = useEntityTools(joiningEntity);

    // Parent Record
    const parentRecord = useAppSelector((state) => parentSelectors.selectRecordByKey(state, parentRecordId)) as EntityData<EntityKeys>;

    const matchingChildRecords = useAppSelector((state) => childSelectors.selectRecordsWithKeys(state, childMatrxIds)) as EntityDataWithKey<EntityKeys>[];

    // Fetch Dependent Records for joining, which I think results in fetching all child records as well as the parent record.
    const fetchChildPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: childMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [childMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (childMatrxIds && childMatrxIds.length > 0) {
            dispatch(childActions.getOrFetchSelectedRecords(fetchChildPayload));
        }
    }, [dispatch, childMatrxIds, fetchChildPayload, childActions]);

    useEffect(() => {
        if (parentRecord) {
            fetchDependentRecords();
        }
    }, [fetchDependentRecords, parentRecord, JoiningEntityRecords]);

    // Extends functionality to add deletion of records
    const { isDeleting, deleteMatrxIdWithChild, deletePkWithChild } = useJoinedDeleteRecord(
        relationshipDefinition,
        joiningSelectors,
        joiningEntity,
        JoiningEntityRecords,
        childEntity
    );

    // TODO: Need Create Record Logic For child/joining -- This would include starting the process and then finishing it to save the records.
    const createRelatedRecords = useUnsavedJoinedWithParent(relationshipDefinition, parentRecordId);

    // Possibly include unsaved record updates here or not
    // ====== app\entities\hooks\unsaved-records\useUpdateFields.ts

    // TODO: Need Update Records Logic For child/joining & Parent

    // TODO: Need logic that allows for existing child records to be connected to parent via a new join (Create Join, but not child)

    return {
        // Entity tools
        parentId,
        parentSelectors,
        parentActions,
        childSelectors,
        childActions,
        joiningSelectors,
        joiningActions,

        // Parent data
        parentEntity,
        parentRecord,
        parentRecordId,

        // Joining data
        joiningEntity,
        JoiningEntityRecords,
        joiningMatrxIds,

        // Child data
        childEntity,
        matchingChildRecords,
        childMatrxIds,

        // Relationship data
        relationshipData: createRelationshipData(relationshipDefinition, parentRecordId),

        deleteMatrxIdWithChild,
        deletePkWithChild,
        isDeleting,
        // Utilities
        fetchDependentRecords,

        // Create Records
        createRelatedRecords,
    };
}

export function useJoinedRecordsActiveParent(relationshipDefinition: RelationshipDefinition) {
    const selectors = createEntitySelectors(relationshipDefinition.parentEntity.entityKey);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const parentId = toPkValue(activeParentMatrxId);

    return useJoinedRecords(relationshipDefinition, parentId);
}

export function useJoinedDeleteRecord(
    relationshipDefinition: RelationshipDefinition,
    joiningSelectors,
    joiningEntity: EntityKeys,
    JoiningEntityRecords,
    childEntity: EntityKeys
) {
    // Get all joining record IDs at the hook level
    const { deleteRecords, isDeleting } = useSequentialDelete(joiningEntity, childEntity, (success) => {
        console.log('Delete callback');
        if (success) {
            console.log('Both records deleted successfully');
        } else {
            console.log('Deletion failed');
        }
    });

    const deleteMatrxIdWithChild = useCallback(
        (childRecordId: MatrxRecordId) => {
            console.log('==== deleteMatrxIdWithChild childRecordId:', childRecordId);
            const childIdToDelete = toPkValues(childRecordId)[0];
            console.log('==== childIdToDelete:', childIdToDelete);
            const joiningRecordToDelete = filterJoinForChild(JoiningEntityRecords, childIdToDelete, relationshipDefinition)[0];
            console.log('==== joiningRecordToDelete:', joiningRecordToDelete);

            if (joiningRecordToDelete) {
                console.log('==== deleting records:', joiningRecordToDelete, childRecordId);
                deleteRecords(joiningRecordToDelete.id, childRecordId);
            }
        },
        [deleteRecords, JoiningEntityRecords, childEntity, relationshipDefinition]
    );

    const deletePkWithChild = useCallback(
        (primaryKeyValue: any) => {
            console.log('==== deletePkWithChild primaryKeyValue:', primaryKeyValue);
            const joiningRecordsToDelete = filterJoinForChild(JoiningEntityRecords, primaryKeyValue, relationshipDefinition);
            console.log('==== joiningRecordsToDelete:', joiningRecordsToDelete);
            
            const joiningRecord = JoiningEntityRecords.find((record) => record.id === joiningRecordsToDelete[0]?.id);
            console.log('==== joiningRecord:', joiningRecord);

            if (joiningRecord?.matrxRecordId) {
                console.log('==== deleting records:', joiningRecord.matrxRecordId, primaryKeyValue);
                deleteRecords(joiningRecord.matrxRecordId, primaryKeyValue);
            }
        },
        [deleteRecords, JoiningEntityRecords, relationshipDefinition]
    );

    return {
        deleteMatrxIdWithChild,
        deletePkWithChild,
        isDeleting,
    };
}
