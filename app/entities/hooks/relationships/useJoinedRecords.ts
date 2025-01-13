import { createEntitySelectors, GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityData, EntityKeys, MatrxRecordId } from '@/types';
import { useCallback, useEffect } from 'react';
import { RelationshipDefinition, createRelationshipData, filterJoinForChild } from './utils';
import React from 'react';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import { useEntityKeys, useEntityKeysBatch, useRecordIdToPk } from '@/lib/redux/entity/hooks/useKeys';

export function useJoinedRecords(relationshipDefinition: RelationshipDefinition, parentId: string) {
    const dispatch = useAppDispatch();

    const parentEntity = relationshipDefinition.parentEntity.entityKey;
    const parentReferencedField = relationshipDefinition.parentEntity.referenceField;
    const childEntity = relationshipDefinition.childEntity.entityKey;
    const joiningEntity = relationshipDefinition.joiningEntity.entityKey;
    const joiningParentField = relationshipDefinition.joiningEntity.parentField;
    const joiningChildField = relationshipDefinition.joiningEntity.childField;

    const {
        recordId: parentRecordId,
        primaryKeyValues: parentPrimaryKeyValues,
        primaryKeyValue: parentPrimaryKeyValue,
    } = useEntityKeys({ entityKey: parentEntity, primaryKeyValue: parentId });

    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);
    const { selectors: joiningSelectors, actions: joiningActions } = useEntityTools(joiningEntity);

    const parentRecord = useAppSelector((state) => parentSelectors.selectRecordByKey(state, parentRecordId)) as EntityData<EntityKeys>;

    const parentFieldId = parentRecord?.[parentReferencedField];

    const JoiningEntityRecords = useAppSelector(joiningSelectors.selectRecordsByFieldValue(joiningParentField, parentFieldId)) as EntityData<EntityKeys>[];

    const joiningMatrxIds = useAppSelector((state) => joiningSelectors.selectRecordIdsByRecords(state, JoiningEntityRecords));

    const matchingChildIds = React.useMemo(
        () => JoiningEntityRecords.filter((record) => record?.[joiningChildField] != null).map((record) => record[joiningChildField]),
        [JoiningEntityRecords, joiningChildField]
    );

    const {
        recordIdList: childMatrxIds,
        primaryKeyValuesList: childPrimaryKeyValues,
        primaryKeyValueList: childPrimaryKeyValue,
    } = useEntityKeysBatch({ entityKey: parentEntity, primaryKeyValueList: matchingChildIds });

    const matchingChildRecords = useAppSelector((state) => childSelectors.selectRecordsByKeys(state, childMatrxIds)) as EntityData<EntityKeys>[];

    const fetchChildPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: childMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [childMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (parentFieldId && childMatrxIds.length > 0) {
            dispatch(childActions.getOrFetchSelectedRecords(fetchChildPayload));
        }
    }, [dispatch, parentFieldId, childMatrxIds, fetchChildPayload, childActions]);

    useEffect(() => {
        if (parentFieldId) {
            fetchDependentRecords();
        }
    }, [fetchDependentRecords, parentFieldId, JoiningEntityRecords]);

    const { isDeleting, deleteMatrxIdWithChild, deletePkWithChild } = useJoinedDeleteRecord(
        relationshipDefinition,
        joiningSelectors,
        joiningEntity,
        JoiningEntityRecords,
        childEntity
    );

    return {
        // Entity tools
        parentSelectors,
        parentActions,
        childSelectors,
        childActions,
        joiningSelectors,
        joiningActions,

        // Parent data
        parentEntity,
        parentRecord,
        parentFieldId,
        parentRecordId,
        parentPrimaryKeyValues,
        parentPrimaryKeyValue,

        // Joining data
        joiningEntity,
        JoiningEntityRecords,
        joiningMatrxIds,

        // Child data
        childEntity,
        matchingChildRecords,
        childMatrxIds,
        childPrimaryKeyValues,
        childPrimaryKeyValue,

        // Relationship data
        relationshipData: createRelationshipData(relationshipDefinition, parentRecordId),

        deleteMatrxIdWithChild,
        deletePkWithChild,
        isDeleting,
        // Utilities
        fetchDependentRecords,
    };
}

export function useJoinedRecordsActiveParent(relationshipDefinition: RelationshipDefinition) {
    const selectors = createEntitySelectors(relationshipDefinition.parentEntity.entityKey);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const parentId = useRecordIdToPk(relationshipDefinition.parentEntity.entityKey, activeParentMatrxId);
    console.log('- useJoinedRecordsActiveParent parentId', activeParentMatrxId);
    return useJoinedRecords(relationshipDefinition, parentId);
}

export function useJoinedDeleteRecord(relationshipDefinition, joiningSelectors, joiningEntity, JoiningEntityRecords, childEntity) {
    // Get all joining record IDs at the hook level
    const allJoiningRecordIds = useAppSelector((state) => 
        joiningSelectors.selectRecordIdsByRecords(state, JoiningEntityRecords)
    );

    const { deleteRecords, isDeleting } = useSequentialDelete(joiningEntity, childEntity, (success) => {
        if (success) {
            console.log('Both records deleted successfully');
        } else {
            console.log('Deletion failed');
        }
    });

    const deleteMatrxIdWithChild = useCallback(
        (childRecordId: MatrxRecordId) => {
            const childIdToDelete = useRecordIdToPk(childEntity, childRecordId);
            const joiningRecordsToDelete = filterJoinForChild(JoiningEntityRecords, childIdToDelete, relationshipDefinition);
            // Find the corresponding joining record ID from our pre-selected IDs
            const joiningRecordId = allJoiningRecordIds[JoiningEntityRecords.indexOf(joiningRecordsToDelete[0])];

            if (joiningRecordId) {
                deleteRecords(joiningRecordId, childRecordId);
            }
        },
        [deleteRecords, JoiningEntityRecords, allJoiningRecordIds, childEntity, relationshipDefinition]
    );

    const deletePkWithChild = useCallback(
        (primaryKeyValue: any) => {
            const joiningRecordsToDelete = filterJoinForChild(JoiningEntityRecords, primaryKeyValue, relationshipDefinition);
            const joiningRecordId = allJoiningRecordIds[JoiningEntityRecords.indexOf(joiningRecordsToDelete[0])];

            if (joiningRecordId) {
                deleteRecords(joiningRecordId, primaryKeyValue);
            }
        },
        [deleteRecords, JoiningEntityRecords, allJoiningRecordIds, relationshipDefinition]
    );

    return {
        deleteMatrxIdWithChild,
        deletePkWithChild,
        isDeleting,
    };
}