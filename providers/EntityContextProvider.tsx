'use client';

// https://claude.ai/chat/724a1052-6818-45cc-9591-aa17066327e0

import React, {createContext, useContext, useCallback, useMemo} from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useEntityHooks, type HookMap, type HookResults} from './EntityHookProvider';
import {useFetchRelated} from '@/lib/redux/entity/hooks/useFetchRelated';
import {EntityStateField} from '@/lib/redux/entity/types/stateTypes';

type Relationship = {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
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

type ExtendedHookResults = HookResults & {
    fetchRelated?: ReturnType<typeof useFetchRelated>;
};

type EntityContextValue = {
    activeEntityName: EntityKeys;
    getEntityHooks: (entityName: EntityKeys, hooks: Array<keyof HookMap>) => Partial<HookResults>;
    getRelatedEntityHooks: (
        entityName: EntityKeys,
        hooks: (keyof HookMap | 'fetchRelated')[],
        fieldInfo?: EntityStateField,
        formData?: EntityData<EntityKeys>
    ) => Partial<ExtendedHookResults>;
    getRelationships: (entityName: EntityKeys) => { [key in EntityKeys]?: Relationship[] } | undefined;
    getRelationshipType: (entityName: EntityKeys, relatedEntity: EntityKeys) => Relationship['type'] | undefined;
    getRelationshipFields: (entityName: EntityKeys, relatedEntity: EntityKeys) => {
        local: string;
        foreign: string
    } | undefined;
    switchActiveEntity: (entityName: EntityKeys) => void;
};

const EntityContext = createContext<EntityContextValue | null>(null);

export function EntityContextProvider(
    {
        initialEntity,
        relationshipMap,
        children
    }: {
        initialEntity: EntityKeys;
        relationshipMap: RelationshipMap;
        children: React.ReactNode;
    }) {
    const [activeEntityName, setActiveEntityName] = React.useState<EntityKeys>(initialEntity);
    const hookCache = React.useRef(new Map<string, Partial<ExtendedHookResults>>());

    const getEntityHooks = useCallback((
        entityName: EntityKeys,
        hooks: Array<keyof HookMap>
    ) => {
        return useEntityHooks(entityName, hooks);
    }, []);

    const getRelatedEntityHooks = useCallback((
        entityName: EntityKeys,
        hooks: (keyof HookMap | 'fetchRelated')[],
        fieldInfo?: EntityStateField,
        formData?: EntityData<EntityKeys>
    ) => {
        const cacheKey = `${activeEntityName}-${entityName}-${fieldInfo?.name ?? 'default'}`;

        if (!hookCache.current.has(cacheKey)) {
            const relatedHooks = hooks.reduce((acc, hookName) => {
                if (hookName === 'fetchRelated') {
                    acc[hookName] = useFetchRelated({
                        entityKey: entityName,
                        dynamicFieldInfo: fieldInfo,
                        formData,
                        activeEntityKey: activeEntityName
                    });
                } else {
                    const regularHook = useEntityHooks(entityName, [hookName as keyof HookMap]);
                    // @ts-ignore
                    acc[hookName] = regularHook[hookName as keyof HookMap];
                }
                return acc;
            }, {} as Partial<ExtendedHookResults>);

            hookCache.current.set(cacheKey, relatedHooks);
        }

        return hookCache.current.get(cacheKey)!;
    }, [activeEntityName]);

    const getRelationships = useCallback((entityName: EntityKeys) => {
        return relationshipMap[entityName]?.relationships;
    }, [relationshipMap]);

    const getRelationshipType = useCallback((entityName: EntityKeys, relatedEntity: EntityKeys) => {
        return relationshipMap[entityName]?.relationships[relatedEntity]?.[0]?.type;
    }, [relationshipMap]);

    const getRelationshipFields = useCallback((entityName: EntityKeys, relatedEntity: EntityKeys) => {
        const relationship = relationshipMap[entityName]?.relationships[relatedEntity]?.[0];
        return relationship ? {
            local: relationship.localField,
            foreign: relationship.foreignField
        } : undefined;
    }, [relationshipMap]);

    const switchActiveEntity = useCallback((entityName: EntityKeys) => {
        setActiveEntityName(entityName);
        hookCache.current.clear();
    }, []);

    const value = useMemo(() => ({
        activeEntityName,
        getEntityHooks,
        getRelatedEntityHooks,
        getRelationships,
        getRelationshipType,
        getRelationshipFields,
        switchActiveEntity
    }), [
        activeEntityName,
        getEntityHooks,
        getRelatedEntityHooks,
        getRelationships,
        getRelationshipType,
        getRelationshipFields,
        switchActiveEntity
    ]);

    return (
        <EntityContext.Provider value={value}>
            {children}
        </EntityContext.Provider>
    );
}

export function useEntityContext() {
    const context = useContext(EntityContext);
    if (!context) {
        throw new Error('useEntityContext must be used within EntityContextProvider');
    }
    return context;
}

export function useRelatedEntityHooks(
    entityName: EntityKeys,
    hooks: (keyof HookMap | 'fetchRelated')[],
    fieldInfo?: EntityStateField,
    formData?: EntityData<EntityKeys>
) {
    const {getRelatedEntityHooks} = useEntityContext();
    return getRelatedEntityHooks(entityName, hooks, fieldInfo, formData);
}

export function useActiveEntityHooks(
    hooks: Array<keyof HookMap>
) {
    const {activeEntityName, getEntityHooks} = useEntityContext();
    return getEntityHooks(activeEntityName, hooks);
}

export function useEntityRelationships(entityName: EntityKeys) {
    const {getRelationships, getRelationshipType, getRelationshipFields} = useEntityContext();

    return {
        relationships: getRelationships(entityName),
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
