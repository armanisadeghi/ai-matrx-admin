import { useCallback } from 'react';
import { useEntityTools, useAppSelector, useAppDispatch, useAppStore } from '@/lib/redux';
import { EntityAnyFieldKey, EntityKeys, MatrxRecordId } from '@/types';
import { useStartCreateRecord } from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { useCreateRecord } from './useCreateRecord';
import { callbackManager } from '@/utils/callbackManager';
import { createRelationshipData } from '../relationships/utils';
import { v4 as uuidv4 } from 'uuid';

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

        // Additional data for sorting and filtering logic (Unrelated to this hook)
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
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const config = createRelationshipData(relationshipDefinition, parentRecordId);

    // Parent Entity
    const parentEntity = config.parentEntity.entityKey;
    const parentReferenceField = config.parentEntity.referenceField;
    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const parentRecord = useAppSelector((state) => parentSelectors.selectRecordByKey(state, parentRecordId));
    const parentFieldValue = useAppSelector((state) => parentSelectors.selectFieldByKey(state, parentRecordId, parentReferenceField));

    // Child Entity
    const childEntity = config.childEntity.entityKey;
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);
    const childRecord = useStartCreateRecord<C>({ entityKey: childEntity });
    const childUpdates = useUpdateFields(childEntity);
    const childCreate = useCreateRecord(childEntity);

    // Joining Entity
    const joiningEntity = config.joiningEntity.entityKey;
    const joingParentField = config.joiningEntity.parentField;
    const joinChildField = config.joiningEntity.childField;
    const { selectors: joiningSelectors, actions: joiningActions } = useEntityTools(joiningEntity);
    const joinRecord = useStartCreateRecord<J>({ entityKey: joiningEntity });
    const joinUpdates = useUpdateFields(joiningEntity);
    const joinCreate = useCreateRecord(joiningEntity);


    
    const getOrFetchParentRecord = useCallback(() => {
        dispatch(
            parentActions.getOrFetchSelectedRecords({
                matrxRecordIds: [parentRecordId],
                fetchMode: 'fkIfk',
            })
        );
    }, [parentActions, parentRecordId]);

    const getNewTempUUID = useCallback(() => {
        const prefix = 'new-record-';
        return prefix + uuidv4();
    }, []);

    // Start creation process
    const start = useCallback(() => {
        if (!parentFieldValue) {
            getOrFetchParentRecord();
            return null;
        }

        const childTempId = getNewTempUUID();
        const joinTempId = getNewTempUUID();

        // Create records
        childRecord.create();
        joinRecord.create();

        // Set up child reference
        childUpdates.updateField(childTempId, config.childEntity.referenceField, config.childEntity.value);

        // Set up join references
        joinUpdates.updateFields(joinTempId, {
            [joingParentField]: parentFieldValue,
            [joinChildField]: config.childEntity.value,
        });

        return joinTempId;
    }, [parentFieldValue, getOrFetchParentRecord]);

    // Start with initial data
    const startWithData = useCallback(
        (childData: Partial<C>, joinData: Partial<J>) => {
            const joinTempId = start();
            if (!joinTempId) return null;

            // Update child record
            childUpdates.updateFields(getNewTempUUID(), childData);

            // Update join record, excluding reference fields
            const safeJoinData = { ...joinData };
            delete safeJoinData[joingParentField];
            delete safeJoinData[joinChildField];

            if (Object.keys(safeJoinData).length > 0) {
                joinUpdates.updateFields(joinTempId, safeJoinData);
            }

            return joinTempId;
        },
        [start, childUpdates, joinUpdates]
    );

    // Update methods
    const updateChildField = useCallback(
        (fieldName: string, value: any) => {
            childUpdates.updateField(getNewTempUUID(), fieldName, value);
        },
        [childUpdates, getNewTempUUID]
    );

    const updateJoinedField = useCallback(
        (fieldName: string, value: any) => {
            if (fieldName !== joingParentField && fieldName !== joinChildField) {
                joinUpdates.updateField(getNewTempUUID(), fieldName, value);
            }
        },
        [joinUpdates, getNewTempUUID]
    );

    // Batch update methods
    const updateChildFields = useCallback(
        (updates: Partial<C>) => {
            childUpdates.updateFields(getNewTempUUID(), updates);
        },
        [childUpdates, getNewTempUUID]
    );

    const updateJoinedFields = useCallback(
        (updates: Partial<J>) => {
            const safeUpdates = { ...updates };
            delete safeUpdates[joingParentField];
            delete safeUpdates[joinChildField];

            if (Object.keys(safeUpdates).length > 0) {
                joinUpdates.updateFields(getNewTempUUID(), safeUpdates);
            }
        },
        [joinUpdates, getNewTempUUID]
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

        const childTempId = getNewTempUUID();
        const joinTempId = getNewTempUUID();

        childCreate.createRecord(childTempId);

        // Listen for the child creation to complete before creating the join
        dispatch(
            childActions.createRecord({
                ...childSelectors.selectCreatePayload(store.getState(), childTempId),
                callbackId: callbackManager.register(({ success }) => {
                    if (success) {
                        joinCreate.createRecord(joinTempId);
                    }
                }),
            })
        );
    }, [childCreate, joinCreate, getNewTempUUID, getNewTempUUID, parentFieldValue, childActions, dispatch]);

    return {
        // Start methods
        start,
        startWithData,

        // Update child fields (Single or Batch)
        updateChildField,
        updateChildFields,

        // Update joined fields (Single or Batch)
        updateJoinedField,
        updateJoinedFields,

        // Full Batch Update (Multiple Child & Joined Fields)
        updateBoth,

        // Finalize & Create Database Records
        create,

        // Watching Parent
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
