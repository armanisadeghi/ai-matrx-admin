import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityKeys, EntityData, MatrxRecordId } from '@/types';
import React, { useEffect, useCallback } from 'react';
import { RelationshipDefinition, createRelationshipData } from './utils';

export function useActiveJoinedRecords(relationshipDefinition: RelationshipDefinition) {
    const dispatch = useAppDispatch();

    const parentEntity = relationshipDefinition.parentEntity.entityKey;
    const parentReferencedField = relationshipDefinition.parentEntity.referenceField;
    const childEntity = relationshipDefinition.childEntity.entityKey;
    const joiningEntity = relationshipDefinition.joiningEntity.entityKey;
    const joiningParentField = relationshipDefinition.joiningEntity.parentField;
    const joiningChildField = relationshipDefinition.joiningEntity.childField;

    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);
    const { selectors: joiningSelectors, actions: joiningActions } = useEntityTools(joiningEntity);

    const activeParentRecord = useAppSelector(parentSelectors.selectActiveRecord) as EntityData<EntityKeys>;
    const activeParentMatrxId = useAppSelector(parentSelectors.selectActiveRecordId) as MatrxRecordId;

    const relationshipData = createRelationshipData(relationshipDefinition, activeParentMatrxId);

    const activeParentRefererenceField = parentReferencedField;
    const activeParentFieldId = activeParentRecord?.[activeParentRefererenceField];

    const JoiningEntityRecords = useAppSelector(
        joiningSelectors.selectRecordsByFieldValue(joiningParentField, activeParentFieldId)
    ) as EntityData<EntityKeys>[];


    const matchingChildIds = React.useMemo(
        () => JoiningEntityRecords.filter((record) => record?.[joiningChildField] != null).map((record) => record[joiningChildField]),
        [JoiningEntityRecords]
    );

    const joiningMatrxIds = useAppSelector((state) => joiningSelectors.selectRecordIdsByRecords(state, JoiningEntityRecords));

    const childMatrxIds = useAppSelector((state) => childSelectors.selectMatrxRecordIdsBySimpleKeys(state, matchingChildIds));
    const matchingChildRecords = useAppSelector((state) => childSelectors.selectRecordsByKeys(state, childMatrxIds)) as EntityData<EntityKeys>[];

    const fetchChildPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: childMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [childMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (activeParentFieldId && childMatrxIds.length > 0) {
            dispatch(childActions.getOrFetchSelectedRecords(fetchChildPayload));
        }
    }, [dispatch, activeParentFieldId, childMatrxIds, fetchChildPayload]);

    useEffect(() => {
        if (activeParentFieldId) {
            fetchDependentRecords();
        }
    }, [fetchDependentRecords, activeParentFieldId, JoiningEntityRecords]);

    return {
        parentSelectors,
        parentActions,
        activeParentRecord,
        activeParentMatrxId,

        JoiningEntityRecords,
        joiningMatrxIds,
        joiningSelectors,
        joiningActions,

        matchingChildRecords,
        childMatrxIds,
        childSelectors,
        childActions,

        relationshipData,
    };
}





/* examplte usage

const relationshipDefinition: RelationshipDefinition = {
    parentEntity: {
        entityKey: 'recipe',
        referenceField: 'id',
    },
    childEntity: {
        entityKey: 'messageTemplate',
        referenceField: 'id',
    },
    joiningEntity: {
        entityKey: 'recipeMessage',
        parentField: 'recipeId',
        childField: 'messageId',
        orderPositionField: 'order',
    },
};

*/