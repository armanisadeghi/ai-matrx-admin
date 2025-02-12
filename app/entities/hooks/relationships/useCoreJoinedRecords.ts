import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityKeys, EntityData } from '@/types';
import React, { useEffect, useCallback } from 'react';
import { createRelationshipData } from './utils';

// Base hook for getting join relationships
export function useJoinedRecords(
    relationshipDefinition,
    options?: {
        parentRecordId?: string; // Optional: specific parent record ID
        parentFieldValue?: string; // Optional: specific parent field value
        skipFetch?: boolean; // Optional: skip auto-fetching
    }
) {
    const dispatch = useAppDispatch();

    const {
        parentEntity: { entityKey: parentEntity, referenceField: parentReferencedField },
        childEntity: { entityKey: childEntity },
        joiningEntity: { entityKey: joiningEntity, parentField: joiningParentField, childField: joiningChildField },
    } = relationshipDefinition;

    // Get entity tools
    const { selectors: parentSelectors, actions: parentActions } = useEntityTools(parentEntity);
    const { selectors: childSelectors, actions: childActions } = useEntityTools(childEntity);
    const { selectors: joiningSelectors, actions: joiningActions } = useEntityTools(joiningEntity);

    // Get parent field value - either from options or from active record
    const activeParentRecord = useAppSelector(parentSelectors.selectActiveRecord);
    const activeParentMatrxId = useAppSelector(parentSelectors.selectActiveRecordId);

    const parentFieldValue = options?.parentFieldValue ?? options?.parentRecordId ?? activeParentRecord?.[parentReferencedField];

    // Get joining records
    const JoiningEntityRecords = useAppSelector((state) => joiningSelectors.selectRecordsByFieldValueHelper(state, joiningParentField, parentFieldValue)) as EntityData<EntityKeys>[];

    // Get child records
    const matchingChildIds = React.useMemo(
        () => JoiningEntityRecords.filter((record) => record?.[joiningChildField] != null).map((record) => record[joiningChildField]),
        [JoiningEntityRecords, joiningChildField]
    );

    const childMatrxIds = useAppSelector((state) => childSelectors.selectMatrxRecordIdsBySimpleKeys(state, matchingChildIds));

    const matchingChildRecords = useAppSelector((state) => childSelectors.selectRecordsByKeys(state, childMatrxIds)) as EntityData<EntityKeys>[];

    // Fetch handling
    const fetchChildPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: childMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [childMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (!options?.skipFetch && parentFieldValue && childMatrxIds.length > 0) {
            dispatch(childActions.getOrFetchSelectedRecords(fetchChildPayload));
        }
    }, [dispatch, parentFieldValue, childMatrxIds, fetchChildPayload, options?.skipFetch]);

    // Only fetch if we're not skipping and have necessary data
    useEffect(() => {
        fetchDependentRecords();
    }, [fetchDependentRecords]);

    return {
        // Entity tools
        parentSelectors,
        parentActions,
        childSelectors,
        childActions,
        joiningSelectors,
        joiningActions,

        // Records
        parentRecord: activeParentRecord,
        parentRecordId: activeParentMatrxId,
        parentFieldValue,

        JoiningEntityRecords,
        matchingChildRecords,

        // IDs
        childMatrxIds,

        // Utils
        relationshipData: createRelationshipData(relationshipDefinition, options?.parentRecordId ?? activeParentMatrxId),
        fetchDependentRecords,
    };
}

// Convenience hook for active record scenarios
export function useActiveJoinedRecords(relationshipDefinition) {
    return useJoinedRecords(relationshipDefinition);
}

// Hook for specific record scenarios
export function useRecordJoinedRecords(relationshipDefinition, parentRecordId: string) {
    return useJoinedRecords(relationshipDefinition, { parentRecordId });
}

// Hook for field value scenarios
export function useFieldValueJoinedRecords(relationshipDefinition, fieldValue: string) {
    return useJoinedRecords(relationshipDefinition, { parentFieldValue: fieldValue });
}
