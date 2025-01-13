// useUnsavedRelatedRecords



import { useCallback } from 'react';
import { generateTempRecordIdFromFutureId, useEntityTools } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useCreateRecord } from './useCreateRecord';
import useStartCreateRecord from './useStartCreateRecord';
import { useUpdateFields } from './useUpdateFields';
import { recipe } from '@/utils/schema/initialTableSchemas';
import { join } from 'path';

interface RelatedRecordsConfig {
    primary: {
        entityKey: EntityKeys;
        referenceField: string;
        value: string;
    };
    related: {
        entityKey: EntityKeys;
        referencingField: string;
    };
}

export const useUnsavedRelatedRecords = <P extends Record<string, any>, R extends Record<string, any>>(
    config: RelatedRecordsConfig
) => {
    // Get store access for both entities to generate temp IDs
    const primaryTools = useEntityTools(config.primary.entityKey);
    const relatedTools = useEntityTools(config.related.entityKey);

    // Initialize hooks for both entities
    const primaryRecord = useStartCreateRecord<P>({ entityKey: config.primary.entityKey });
    const relatedRecord = useStartCreateRecord<R>({ entityKey: config.related.entityKey });
    
    const primaryUpdates = useUpdateFields(config.primary.entityKey);
    const relatedUpdates = useUpdateFields(config.related.entityKey);
    
    const primaryCreate = useCreateRecord(config.primary.entityKey);
    const relatedCreate = useCreateRecord(config.related.entityKey);

    // Generate temp IDs based on the provided value
    const getPrimaryTempId = useCallback(() => {
        const primaryState = primaryTools.store.getState()[config.primary.entityKey];
        return generateTempRecordIdFromFutureId(primaryState, config.primary.value);
    }, [primaryTools.store, config.primary.entityKey, config.primary.value]);

    const getRelatedTempId = useCallback(() => {
        const relatedState = relatedTools.store.getState()[config.related.entityKey];
        return generateTempRecordIdFromFutureId(relatedState, config.primary.value);
    }, [relatedTools.store, config.related.entityKey, config.primary.value]);

    // Start both records with their respective reference fields
    const start = useCallback(() => {
        const primaryTempId = getPrimaryTempId();
        const relatedTempId = getRelatedTempId();

        primaryRecord.create(); // Use existing hook's create method
        relatedRecord.create(); // Use existing hook's create method

        // Set up the relationship immediately
        primaryUpdates.updateField(primaryTempId, config.primary.referenceField, config.primary.value);
        relatedUpdates.updateField(relatedTempId, config.related.referencingField, config.primary.value);

        return primaryTempId; // Return primary ID as the reference for components
    }, [getPrimaryTempId, getRelatedTempId, primaryRecord, relatedRecord, primaryUpdates, relatedUpdates]);

    // Start with initial data
    const startWithData = useCallback((primaryData: Partial<P>, relatedData: Partial<R>) => {
        const primaryTempId = getPrimaryTempId();
        const relatedTempId = getRelatedTempId();

        // Start both records
        primaryRecord.createWithData({
            ...primaryData,
            [config.primary.referenceField]: config.primary.value
        });
        
        relatedRecord.createWithData({
            ...relatedData,
            [config.related.referencingField]: config.primary.value
        });

        return primaryTempId;
    }, [getPrimaryTempId, getRelatedTempId, primaryRecord, relatedRecord]);

    // Update methods for both records
    const updatePrimaryField = useCallback((fieldName: string, value: any) => {
        primaryUpdates.updateField(getPrimaryTempId(), fieldName, value);
    }, [primaryUpdates, getPrimaryTempId]);

    const updateRelatedField = useCallback((fieldName: string, value: any) => {
        relatedUpdates.updateField(getRelatedTempId(), fieldName, value);
    }, [relatedUpdates, getRelatedTempId]);

    // Create both records in the correct order
    const create = useCallback(() => {
        primaryCreate.createRecord(getPrimaryTempId());
        relatedCreate.createRecord(getRelatedTempId());
    }, [primaryCreate, relatedCreate, getPrimaryTempId, getRelatedTempId]);

    // Add batch update methods for primary and related records
    const updatePrimaryFields = useCallback((updates: Partial<P>) => {
        primaryUpdates.updateFields(getPrimaryTempId(), updates);
    }, [primaryUpdates, getPrimaryTempId]);

    const updateRelatedFields = useCallback((updates: Partial<R>) => {
        relatedUpdates.updateFields(getRelatedTempId(), updates);
    }, [relatedUpdates, getRelatedTempId]);

    // Combined update method for both records
    const updateBoth = useCallback((updates: { 
        primary?: Partial<P>, 
        related?: Partial<R> 
    }) => {
        if (updates.primary) {
            updatePrimaryFields(updates.primary);
        }
        if (updates.related) {
            updateRelatedFields(updates.related);
        }
    }, [updatePrimaryFields, updateRelatedFields]);

    return {
        start,
        startWithData,
        updatePrimaryField,
        updateRelatedField,
        updatePrimaryFields,
        updateRelatedFields,
        updateBoth,
        create
    };
};

export default useUnsavedRelatedRecords;




/* example usage
const relationship = useUnsavedRelatedRecords({
    primary: {
        entityKey: 'messages',
        referenceField: 'id',
        value: messageId
    },
    related: {
        entityKey: 'messageTemplates',
        referencingField: 'messageId'
    }
});

// Start both records
const relationshipId = relationship.start();


// Individual field updates (original methods)
relationship.updatePrimaryField('title', 'New Title');
relationship.updateRelatedField('content', 'New Content');

// Batch updates for each entity
relationship.updatePrimaryFields({
    title: 'New Title',
    status: 'active',
    priority: 'high'
});

relationship.updateRelatedFields({
    content: 'New Content',
    type: 'template',
    version: 2
});

// Combined update for both entities
relationship.updateBoth({
    primary: {
        title: 'New Title',
        status: 'active'
    },
    related: {
        content: 'New Content',
        type: 'template'
    }
});

*/

