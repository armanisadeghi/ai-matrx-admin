'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { useAppDispatch } from '@/lib/redux/hooks';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';

type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

type Relationship = {
    type: RelationshipType;
    localField: string;
    foreignField: string;
};

type RelationshipMap = {
    [entityName in EntityKeys]?: {
        relationships: {
            [relatedEntity in EntityKeys]?: Relationship[];
        };
    };
};

type EntityRelationshipContextValue = {
    getRelationships: (entityName: EntityKeys) => { [key in EntityKeys]?: Relationship[] };
    getRelatedEntities: (entityName: EntityKeys) => EntityKeys[];
    fetchRelatedRecord: (entityName: EntityKeys, relatedEntity: EntityKeys, recordId: string) => void;
    getRelationshipType: (entityName: EntityKeys, relatedEntity: EntityKeys) => RelationshipType | undefined;
    getRelationshipFields: (entityName: EntityKeys, relatedEntity: EntityKeys) => { local: string; foreign: string } | undefined;
};

const EntityRelationshipContext = createContext<EntityRelationshipContextValue | null>(null);

export function EntityRelationshipProvider({
                                               relationshipMap,
                                               children
                                           }: {
    relationshipMap: RelationshipMap;
    children: React.ReactNode;
}) {
    const dispatch = useAppDispatch();

    const getRelationships = useCallback((entityName: EntityKeys) => {
        return relationshipMap[entityName]?.relationships || {};
    }, [relationshipMap]);

    const getRelatedEntities = useCallback((entityName: EntityKeys): EntityKeys[] => {
        const relationships = relationshipMap[entityName]?.relationships || {};
        return Object.keys(relationships) as EntityKeys[];
    }, [relationshipMap]);

    const getRelationshipType = useCallback((entityName: EntityKeys, relatedEntity: EntityKeys): RelationshipType | undefined => {
        const relationships = relationshipMap[entityName]?.relationships[relatedEntity];
        return relationships?.[0]?.type;
    }, [relationshipMap]);

    const getRelationshipFields = useCallback((entityName: EntityKeys, relatedEntity: EntityKeys) => {
        const relationship = relationshipMap[entityName]?.relationships[relatedEntity]?.[0];
        return relationship ? {
            local: relationship.localField,
            foreign: relationship.foreignField
        } : undefined;
    }, [relationshipMap]);

    const fetchRelatedRecord = useCallback((
        entityName: EntityKeys,
        relatedEntity: EntityKeys,
        recordId: string
    ) => {
        const { actions } = getEntitySlice(relatedEntity);
        dispatch(actions.fetchOne({ matrxRecordId: recordId }));
    }, [dispatch]);

    const value = useMemo(() => ({
        getRelationships,
        getRelatedEntities,
        fetchRelatedRecord,
        getRelationshipType,
        getRelationshipFields
    }), [getRelationships, getRelatedEntities, fetchRelatedRecord, getRelationshipType, getRelationshipFields]);

    return (
        <EntityRelationshipContext.Provider value={value}>
            {children}
        </EntityRelationshipContext.Provider>
    );
}

export function useEntityRelationships(entityName: EntityKeys) {
    const context = useContext(EntityRelationshipContext);
    if (!context) {
        throw new Error('useEntityRelationships must be used within EntityRelationshipProvider');
    }

    const {
        getRelationships,
        getRelatedEntities,
        fetchRelatedRecord,
        getRelationshipType,
        getRelationshipFields
    } = context;

    const relationships = useMemo(() => getRelationships(entityName), [entityName, getRelationships]);
    const relatedEntities = useMemo(() => getRelatedEntities(entityName), [entityName, getRelatedEntities]);

    const fetchRelated = useCallback((
        relatedEntity: EntityKeys,
        recordId: string
    ) => {
        fetchRelatedRecord(entityName, relatedEntity, recordId);
    }, [entityName, fetchRelatedRecord]);

    return {
        relationships,
        relatedEntities,
        fetchRelated,
        getRelationshipType: useCallback(
            (relatedEntity: EntityKeys) => getRelationshipType(entityName, relatedEntity),
            [entityName, getRelationshipType]
        ),
        getRelationshipFields: useCallback(
            (relatedEntity: EntityKeys) => getRelationshipFields(entityName, relatedEntity),
            [entityName, getRelationshipFields]
        )
    };
}
