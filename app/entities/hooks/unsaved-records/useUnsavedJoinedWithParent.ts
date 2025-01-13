import { useCallback } from 'react';
import { generateTemporaryRecordId, useEntityTools, useAppSelector } from '@/lib/redux';
import { EntityAnyFieldKey, EntityKeys, MatrxRecordId } from '@/types';
import { useStartCreateRecord } from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { useCreateRecord } from './useCreateRecord';
import { callbackManager } from '@/utils/callbackManager';
import { createRelationshipData } from '../relationships/utils';

interface JoinedWithParentConfig {
    parentEntity: {
        entityKey: EntityKeys;
        recordId: MatrxRecordId;
        referenceField: string;
    };
    childEntity: {
        entityKey: EntityKeys;
        referenceField: string;
        value: string;
    };
    joiningEntity: {
        entityKey: EntityKeys;
        parentField: string;
        childField: string;
    };
}
export type RelationshipDefinition = {
    parentEntity: {
        entityKey: EntityKeys;
        referenceField: EntityAnyFieldKey<EntityKeys>;
    };
    childEntity: {
        entityKey: EntityKeys;
        referenceField: EntityAnyFieldKey<EntityKeys>;
    };
    joiningEntity: {
        entityKey: EntityKeys;
        parentField: EntityAnyFieldKey<EntityKeys>;
        childField: EntityAnyFieldKey<EntityKeys>;
        nameField?: EntityAnyFieldKey<EntityKeys> | null;
        orderPositionField?: EntityAnyFieldKey<EntityKeys> | null;
        defaultValueField?: EntityAnyFieldKey<EntityKeys> | null;
        roleTypeField?: EntityAnyFieldKey<EntityKeys> | null;
        priorityField?: EntityAnyFieldKey<EntityKeys> | null;
        paramsField?: EntityAnyFieldKey<EntityKeys> | null;
        statusField?: EntityAnyFieldKey<EntityKeys> | null;
        commentsField?: EntityAnyFieldKey<EntityKeys> | null;
    };
};

export const useUnsavedJoinedWithParent = <P extends Record<string, any>, C extends Record<string, any>, J extends Record<string, any>>(
    relationshipDefinition: RelationshipDefinition,
    parentRecordId: MatrxRecordId
) => {

    const config = createRelationshipData(relationshipDefinition, parentRecordId);
    // Initialize entity tools
    const parentTools = useEntityTools(config.parentEntity.entityKey);
    const childTools = useEntityTools(config.childEntity.entityKey);
    const joinTools = useEntityTools(config.joiningEntity.entityKey);

    // Initialize hooks for child and join entities
    const childRecord = useStartCreateRecord<C>({ entityKey: config.childEntity.entityKey });
    const joinRecord = useStartCreateRecord<J>({ entityKey: config.joiningEntity.entityKey });

    const childUpdates = useUpdateFields(config.childEntity.entityKey);
    const joinUpdates = useUpdateFields(config.joiningEntity.entityKey);

    const childCreate = useCreateRecord(config.childEntity.entityKey);
    const joinCreate = useCreateRecord(config.joiningEntity.entityKey);

    // Parent record loading and fetching
    const isParentLoading = useAppSelector(parentTools.selectors.selectIsLoading);
    const parentRecord = useAppSelector((state) => parentTools.selectors.selectRecordByKey(state, parentRecordId));
    const parentFieldValue = useAppSelector((state) =>
        parentTools.selectors.selectFieldByKey(state, parentRecordId, config.parentEntity.referenceField)
    );

    const getOrFetchParentRecord = useCallback(() => {
        parentTools.dispatch(
            parentTools.actions.getOrFetchSelectedRecords({
                matrxRecordIds: [parentRecordId],
                fetchMode: 'fkIfk',
            })
        );
    }, [parentTools.dispatch, parentTools.actions, parentRecordId]);

    // Get temporary IDs for child and join entities
    const getChildTempId = useCallback(() => {
        const childState = childTools.store.getState()[config.childEntity.entityKey];
        return generateTemporaryRecordId(childState);
    }, [childTools.store, config.childEntity.entityKey]);

    const getJoinTempId = useCallback(() => {
        const joinState = joinTools.store.getState()[config.joiningEntity.entityKey];
        return generateTemporaryRecordId(joinState);
    }, [joinTools.store, config.joiningEntity.entityKey]);

    // Start creation process
    const start = useCallback(() => {
        if (!parentFieldValue) {
            getOrFetchParentRecord();
            return null;
        }

        const childTempId = getChildTempId();
        const joinTempId = getJoinTempId();

        // Create records
        childRecord.create();
        joinRecord.create();

        // Set up child reference
        childUpdates.updateField(childTempId, config.childEntity.referenceField, config.childEntity.value);

        // Set up join references
        joinUpdates.updateFields(joinTempId, {
            [config.joiningEntity.parentField]: parentFieldValue,
            [config.joiningEntity.childField]: config.childEntity.value,
        });

        return joinTempId;
    }, [parentFieldValue, getOrFetchParentRecord]);

    // Start with initial data
    const startWithData = useCallback(
        (childData: Partial<C>, joinData: Partial<J>) => {
            const joinTempId = start();
            if (!joinTempId) return null;

            // Update child record
            childUpdates.updateFields(getChildTempId(), childData);

            // Update join record, excluding reference fields
            const safeJoinData = { ...joinData };
            delete safeJoinData[config.joiningEntity.parentField];
            delete safeJoinData[config.joiningEntity.childField];

            if (Object.keys(safeJoinData).length > 0) {
                joinUpdates.updateFields(joinTempId, safeJoinData);
            }

            return joinTempId;
        },
        [start, childUpdates, joinUpdates]
    );

    // Update methods
    const updateChild = useCallback(
        (fieldName: string, value: any) => {
            childUpdates.updateField(getChildTempId(), fieldName, value);
        },
        [childUpdates, getChildTempId]
    );

    const updateJoined = useCallback(
        (fieldName: string, value: any) => {
            if (fieldName !== config.joiningEntity.parentField && fieldName !== config.joiningEntity.childField) {
                joinUpdates.updateField(getJoinTempId(), fieldName, value);
            }
        },
        [joinUpdates, getJoinTempId]
    );

    // Batch update methods
    const updateChildFields = useCallback(
        (updates: Partial<C>) => {
            childUpdates.updateFields(getChildTempId(), updates);
        },
        [childUpdates, getChildTempId]
    );

    const updateJoinedFields = useCallback(
        (updates: Partial<J>) => {
            const safeUpdates = { ...updates };
            delete safeUpdates[config.joiningEntity.parentField];
            delete safeUpdates[config.joiningEntity.childField];

            if (Object.keys(safeUpdates).length > 0) {
                joinUpdates.updateFields(getJoinTempId(), safeUpdates);
            }
        },
        [joinUpdates, getJoinTempId]
    );

    // Combined update method
    const updateBoth = useCallback(
        (updates: { child?: Partial<C>; joined?: Partial<J> }) => {
            if (updates.child) {
                updateChildFields(updates.child);
            }
            if (updates.joined) {
                updateJoinedFields(updates.joined);
            }
        },
        [updateChildFields, updateJoinedFields]
    );

    // Create records in sequence
    const create = useCallback(() => {
        if (!parentFieldValue) return;

        const childTempId = getChildTempId();
        const joinTempId = getJoinTempId();

        childCreate.createRecord(childTempId);

        // Listen for the child creation to complete before creating the join
        childTools.dispatch(
            childTools.actions.createRecord({
                ...childTools.selectors.selectCreatePayload(childTools.store.getState(), childTempId),
                callbackId: callbackManager.register(({ success }) => {
                    if (success) {
                        joinCreate.createRecord(joinTempId);
                    }
                }),
            })
        );
    }, [childCreate, joinCreate, getChildTempId, getJoinTempId, parentFieldValue, childTools]);

    return {
        start,
        startWithData,
        updateChild,
        updateJoined,
        updateChildFields,
        updateJoinedFields,
        updateBoth,
        create,
        isParentLoading,
        parentRecord,
        parentFieldValue,
    };
};

export default useUnsavedJoinedWithParent;

/*
const relationship = useUnsavedJoinedWithParent({
    parentEntity: {
        entityKey: 'recipes',
        recordId: existingRecipeId,
        referenceField: 'id'
    },
    childEntity: {
        entityKey: 'messages',
        referenceField: 'id',
        value: newMessageId
    },
    joiningEntity: {
        entityKey: 'recipeMessages',
        parentField: 'recipeId',
        childField: 'messageId'
    }
});

// Check if parent is ready
if (relationship.isParentLoading) {
    return <LoadingSpinner />;
}

// Start the relationship
const joinId = relationship.start();
if (!joinId) return null; // Parent data wasn't ready

// Start with initial data
const joinId = relationship.startWithData(
    { content: 'New Message' },  // child data
    { order: nextOrder }         // join data (references protected)
);

// Update as needed
relationship.updateBoth({
    child: { content: 'Updated Message' },
    joined: { order: newOrder }
});

// Create when ready
relationship.create();
*/
