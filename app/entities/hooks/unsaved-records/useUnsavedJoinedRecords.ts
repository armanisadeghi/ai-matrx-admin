import { useCallback } from 'react';
import { generateTemporaryRecordId, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useStartCreateRecord } from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { useCreateRecord } from './useCreateRecord';

interface JoinedRecordsConfig {
    primaryOne: {
        entityKey: EntityKeys;
        referenceField: string;
        value: string;
    };
    primaryTwo: {
        entityKey: EntityKeys;
        referenceField: string;
        value: string;
    };
    joined: {
        entityKey: EntityKeys;
        referencingFieldOne: string;  // References primaryOne
        referencingFieldTwo: string;  // References primaryTwo
    };
}

export const useUnsavedJoinedRecords = <P1 extends Record<string, any>, P2 extends Record<string, any>, J extends Record<string, any>>(
    config: JoinedRecordsConfig
) => {
    // Initialize entity tools for all three entities
    const primaryOneTools = useEntityTools(config.primaryOne.entityKey);
    const primaryTwoTools = useEntityTools(config.primaryTwo.entityKey);
    const joinedTools = useEntityTools(config.joined.entityKey);

    // Initialize hooks for all three entities
    const primaryOneRecord = useStartCreateRecord<P1>({ entityKey: config.primaryOne.entityKey });
    const primaryTwoRecord = useStartCreateRecord<P2>({ entityKey: config.primaryTwo.entityKey });
    const joinedRecord = useStartCreateRecord<J>({ entityKey: config.joined.entityKey });

    const primaryOneUpdates = useUpdateFields(config.primaryOne.entityKey);
    const primaryTwoUpdates = useUpdateFields(config.primaryTwo.entityKey);
    const joinedUpdates = useUpdateFields(config.joined.entityKey);

    const primaryOneCreate = useCreateRecord(config.primaryOne.entityKey);
    const primaryTwoCreate = useCreateRecord(config.primaryTwo.entityKey);
    const joinedCreate = useCreateRecord(config.joined.entityKey);

    // Get temporary IDs for each entity
    const getJoinTempId = useCallback(() => {
        const joinedState = joinedTools.store.getState()[config.joined.entityKey];
        return generateTemporaryRecordId(joinedState);
    }, [joinedTools.store, config.joined.entityKey]);

    const getPrimaryOneTempId = useCallback(() => {
        const primaryOneState = primaryOneTools.store.getState()[config.primaryOne.entityKey];
        return generateTemporaryRecordId(primaryOneState);
    }, [primaryOneTools.store, config.primaryOne.entityKey]);

    const getPrimaryTwoTempId = useCallback(() => {
        const primaryTwoState = primaryTwoTools.store.getState()[config.primaryTwo.entityKey];
        return generateTemporaryRecordId(primaryTwoState);
    }, [primaryTwoTools.store, config.primaryTwo.entityKey]);

    // Start all three records with their respective reference fields
    const start = useCallback(() => {
        const joinTempId = getJoinTempId();
        const primaryOneTempId = getPrimaryOneTempId();
        const primaryTwoTempId = getPrimaryTwoTempId();

        // Create all records
        primaryOneRecord.create();
        primaryTwoRecord.create();
        joinedRecord.create();

        // Set up primary references
        primaryOneUpdates.updateField(primaryOneTempId, config.primaryOne.referenceField, config.primaryOne.value);
        primaryTwoUpdates.updateField(primaryTwoTempId, config.primaryTwo.referenceField, config.primaryTwo.value);

        // Set up join references
        joinedUpdates.updateFields(joinTempId, {
            [config.joined.referencingFieldOne]: config.primaryOne.value,
            [config.joined.referencingFieldTwo]: config.primaryTwo.value
        });

        return joinTempId;
    }, [getJoinTempId, getPrimaryOneTempId, getPrimaryTwoTempId]);

    // Start with initial data
    const startWithData = useCallback((
        primaryOneData: Partial<P1>,
        primaryTwoData: Partial<P2>,
        joinedData: Partial<J>
    ) => {
        const joinTempId = start();

        // Update primary records
        primaryOneUpdates.updateFields(getPrimaryOneTempId(), primaryOneData);
        primaryTwoUpdates.updateFields(getPrimaryTwoTempId(), primaryTwoData);

        // Update joined record, excluding reference fields
        const safeJoinedData = { ...joinedData };
        delete safeJoinedData[config.joined.referencingFieldOne];
        delete safeJoinedData[config.joined.referencingFieldTwo];
        
        if (Object.keys(safeJoinedData).length > 0) {
            joinedUpdates.updateFields(joinTempId, safeJoinedData);
        }

        return joinTempId;
    }, [start, primaryOneUpdates, primaryTwoUpdates, joinedUpdates]);

    // Update methods for all entities
    const updatePrimaryOne = useCallback((fieldName: string, value: any) => {
        primaryOneUpdates.updateField(getPrimaryOneTempId(), fieldName, value);
    }, [primaryOneUpdates, getPrimaryOneTempId]);

    const updatePrimaryTwo = useCallback((fieldName: string, value: any) => {
        primaryTwoUpdates.updateField(getPrimaryTwoTempId(), fieldName, value);
    }, [primaryTwoUpdates, getPrimaryTwoTempId]);

    const updateJoined = useCallback((fieldName: string, value: any) => {
        if (fieldName !== config.joined.referencingFieldOne && 
            fieldName !== config.joined.referencingFieldTwo) {
            joinedUpdates.updateField(getJoinTempId(), fieldName, value);
        }
    }, [joinedUpdates, getJoinTempId]);

    // Batch update methods
    const updatePrimaryOneFields = useCallback((updates: Partial<P1>) => {
        primaryOneUpdates.updateFields(getPrimaryOneTempId(), updates);
    }, [primaryOneUpdates, getPrimaryOneTempId]);

    const updatePrimaryTwoFields = useCallback((updates: Partial<P2>) => {
        primaryTwoUpdates.updateFields(getPrimaryTwoTempId(), updates);
    }, [primaryTwoUpdates, getPrimaryTwoTempId]);

    const updateJoinedFields = useCallback((updates: Partial<J>) => {
        const safeUpdates = { ...updates };
        delete safeUpdates[config.joined.referencingFieldOne];
        delete safeUpdates[config.joined.referencingFieldTwo];

        if (Object.keys(safeUpdates).length > 0) {
            joinedUpdates.updateFields(getJoinTempId(), safeUpdates);
        }
    }, [joinedUpdates, getJoinTempId]);

    // Combined update method
    const updateAll = useCallback((updates: {
        primaryOne?: Partial<P1>,
        primaryTwo?: Partial<P2>,
        joined?: Partial<J>
    }) => {
        if (updates.primaryOne) {
            updatePrimaryOneFields(updates.primaryOne);
        }
        if (updates.primaryTwo) {
            updatePrimaryTwoFields(updates.primaryTwo);
        }
        if (updates.joined) {
            updateJoinedFields(updates.joined);
        }
    }, [updatePrimaryOneFields, updatePrimaryTwoFields, updateJoinedFields]);

    // Create all records in the correct order
    const create = useCallback(() => {
        // Create primary records in parallel
        Promise.all([
            primaryOneCreate.createRecord(getPrimaryOneTempId()),
            primaryTwoCreate.createRecord(getPrimaryTwoTempId())
        ]).then(() => {
            // Create join record after both primaries are created
            joinedCreate.createRecord(getJoinTempId());
        });
    }, [primaryOneCreate, primaryTwoCreate, joinedCreate, getPrimaryOneTempId, getPrimaryTwoTempId, getJoinTempId]);

    return {
        start,
        startWithData,
        updatePrimaryOne,
        updatePrimaryTwo,
        updateJoined,
        updatePrimaryOneFields,
        updatePrimaryTwoFields,
        updateJoinedFields,
        updateAll,
        create
    };
};

export default useUnsavedJoinedRecords;

/*
const relationship = useUnsavedJoinedRecords({
    primaryOne: {
        entityKey: 'messages',
        referenceField: 'id',
        value: messageId
    },
    primaryTwo: {
        entityKey: 'recipes',
        referenceField: 'id',
        value: recipeId
    },
    joined: {
        entityKey: 'recipeMessages',
        referencingFieldOne: 'messageId',
        referencingFieldTwo: 'recipeId'
    }
});

// Start the relationship
const joinId = relationship.start();

// Or start with initial data
const joinId = relationship.startWithData(
    { title: 'Message Title' },  // primaryOne data
    { name: 'Recipe Name' },     // primaryTwo data
    { order: 1 }                 // joined data (references automatically managed)
);

// Update individual fields
relationship.updatePrimaryOne('title', 'New Title');
relationship.updatePrimaryTwo('name', 'New Name');
relationship.updateJoined('order', 2);  // Join references are protected

// Batch updates
relationship.updatePrimaryOneFields({
    title: 'New Title',
    content: 'New Content'
});

// Update all entities at once
relationship.updateAll({
    primaryOne: { title: 'Final Title' },
    primaryTwo: { name: 'Final Name' },
    joined: { order: 3 }  // Join references still protected
});

// Create all records in correct order
relationship.create();
*/