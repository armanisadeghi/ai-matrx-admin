// providers/entity-context/EntityProvider.tsx
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { useEntityHooks, type HookMap, type HookResults, type HookName } from './EntityHookProvider';
import { EntityRelationshipManager } from '@/utils/schema/relationshipUtils';

type EntityContextValue = {
    currentEntity: EntityKeys | null;
    setCurrentEntity: (entity: EntityKeys) => void;
    hookResults: Map<string, Partial<HookResults>>;
    relationshipManager: EntityRelationshipManager;
};

const EntityContext = createContext<EntityContextValue | null>(null);

export function EntityProvider({
                                   children
                               }: {
    children: React.ReactNode;
}) {
    const [currentEntity, setCurrentEntity] = useState<EntityKeys | null>(null);
    const [hookResults] = useState(() => new Map<string, Partial<HookResults>>());

    const relationshipManager = useMemo(() =>
            EntityRelationshipManager.getInstance(),
        []
    );

    const value = useMemo(() => ({
        currentEntity,
        setCurrentEntity,
        hookResults,
        relationshipManager,
    }), [currentEntity, hookResults, relationshipManager]);

    return (
        <EntityContext.Provider value={value}>
            {children}
        </EntityContext.Provider>
    );
}

// Custom hook to safely get entity hooks
function useEntityHooksWithCache(
    entityName: EntityKeys,
    hooks: HookName[]
): Partial<HookResults> {
    const cacheKey = `${entityName}-${hooks.sort().join('-')}`;
    const entityHooks = useEntityHooks(entityName, hooks);

    const context = useContext(EntityContext);
    if (!context) {
        throw new Error('useEntityHooksWithCache must be used within EntityProvider');
    }

    React.useEffect(() => {
        if (!context.hookResults.has(cacheKey)) {
            context.hookResults.set(cacheKey, entityHooks);
        }
    }, [cacheKey, context.hookResults, entityHooks]);

    return entityHooks;
}

// Hook to access entities with optional current entity override
export function useEntities(entityName?: EntityKeys, hooks: HookName[] = []) {
    const context = useContext(EntityContext);
    if (!context) {
        throw new Error('useEntities must be used within EntityProvider');
    }

    const { currentEntity, setCurrentEntity, relationshipManager } = context;
    const targetEntity = entityName || currentEntity;

    // Return limited functionality if no entity is selected
    if (!targetEntity) {
        return {
            currentEntity: null,
            setCurrentEntity,
            relationships: {
                all: Object.keys(relationshipManager.getAllEntities()) as EntityKeys[]
            }
        };
    }

    const entityHooks = useEntityHooksWithCache(targetEntity, hooks);

    const relationships = useMemo(() => ({
        direct: relationshipManager.getDirectRelationships(targetEntity),
        inverse: relationshipManager.getInverseRelationships(targetEntity),
        all: relationshipManager.getAllRelatedEntities(targetEntity),
        getType: (relatedEntity: EntityKeys) =>
            relationshipManager.getRelationshipType(targetEntity, relatedEntity),
        getFields: (relatedEntity: EntityKeys) =>
            relationshipManager.getRelationshipFields(targetEntity, relatedEntity)
    }), [targetEntity, relationshipManager]);

    return {
        ...entityHooks,
        currentEntity: targetEntity,
        setCurrentEntity,
        relationships
    };
}

// Optional hook for just relationship access
export function useEntityRelationships(entityName?: EntityKeys) {
    const { relationships } = useEntities(entityName, []);
    return relationships;
}

// Hook for direct context access if needed
export function useEntityContext() {
    const context = useContext(EntityContext);
    if (!context) {
        throw new Error('useEntityContext must be used within EntityProvider');
    }
    return context;
}