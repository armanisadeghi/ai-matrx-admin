import React, {createContext, useContext, useMemo} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {EntityRelationshipManager} from '@/utils/schema/relationshipUtils';

// Import all hooks
import {useActiveRecords} from '@/lib/redux/entity/hooks/useActiveRecords';
import {useEntity} from '@/lib/redux/entity/hooks/useEntity';
import {useEntityAnalyzer} from '@/lib/redux/entity/hooks/useEntityAnalyzer';
import {useEntityCrud} from '@/lib/redux/entity/hooks/useEntityCrud';
import {useEntityForm} from '@/lib/redux/entity/hooks/useEntityForm';
import {useEntityMetrics} from '@/lib/redux/entity/hooks/useEntityMetrics';
import {useEntitySelection} from '@/lib/redux/entity/hooks/useEntitySelection';
import {useEntityToasts} from '@/lib/redux/entity/hooks/useEntityToasts';
import {useFetchRecords} from '@/lib/redux/entity/hooks/useFetchRecords';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {useEntityValidation} from "@/lib/redux/entity/hooks/useEntityValidation";

// Separate contexts for entities and relationship manager
const RelationshipContext = createContext<EntityRelationshipManager | null>(null);

type EntityHooks = {
    activeRecords: ReturnType<typeof useActiveRecords>;
    entity: ReturnType<typeof useEntity>;
    entityAnalyzer: ReturnType<typeof useEntityAnalyzer>;
    entityCrud: ReturnType<typeof useEntityCrud>;
    entityForm: ReturnType<typeof useEntityForm>;
    // entityMetrics: ReturnType<typeof useEntityMetrics>;
    entitySelection: ReturnType<typeof useEntitySelection>;
    entityToasts: ReturnType<typeof useEntityToasts>;
    fetchRecords: ReturnType<typeof useFetchRecords>;
    quickReference: ReturnType<typeof useQuickReference>;
    validation: ReturnType<typeof useEntityValidation>;
    relationships: {
        direct: ReturnType<EntityRelationshipManager['getDirectRelationships']>;
        inverse: ReturnType<EntityRelationshipManager['getInverseRelationships']>;
        all: ReturnType<EntityRelationshipManager['getAllRelatedEntities']>;
    };
};

type EntityContextValue = {
    [K in EntityKeys]: EntityHooks;
} | null;

const EntityContext = createContext<EntityContextValue>(null);

// Main provider component
export function EntityProvider({children}: { children: React.ReactNode }) {
    const relationshipManager = useMemo(() => EntityRelationshipManager.getInstance(), []);

    return (
        <RelationshipContext.Provider value={relationshipManager}>
            <EntityInitializationProvider>
                {children}
            </EntityInitializationProvider>
        </RelationshipContext.Provider>
    );
}

// Separate component for entity initialization
function EntityInitializationProvider({children}: { children: React.ReactNode }) {
    const relationshipManager = useContext(RelationshipContext);
    if (!relationshipManager) {
        throw new Error('EntityInitializationProvider must be used within RelationshipContext');
    }

    const [entities, setEntities] = React.useState<EntityContextValue>(null);
    const entityNames = useMemo(() =>
            Object.keys(relationshipManager.getAllEntities()) as EntityKeys[],
        [relationshipManager]
    );

    const handleInitialized = React.useCallback((entityName: EntityKeys, hooks: EntityHooks) => {
        setEntities(prev => ({
            ...prev,
            [entityName]: hooks
        }));
    }, []);

    return (
        <EntityContext.Provider value={entities}>
            {entityNames.map(entityName => (
                <EntityInitializer
                    key={entityName}
                    entityName={entityName}
                    onInitialized={handleInitialized}
                />
            ))}
            {entities && Object.keys(entities).length === entityNames.length && children}
        </EntityContext.Provider>
    );
}

function EntityInitializer(
    {
        entityName,
        onInitialized
    }: {
        entityName: EntityKeys;
        onInitialized: (entityName: EntityKeys, hooks: EntityHooks) => void;
    }) {
    const relationshipManager = useContext(RelationshipContext);
    if (!relationshipManager) {
        throw new Error('EntityInitializer must be used within RelationshipContext');
    }

    const activeRecords = useActiveRecords(entityName);
    const entity = useEntity(entityName);
    const entityAnalyzer = useEntityAnalyzer(entityName);
    const entityCrud = useEntityCrud(entityName);
    const entityForm = useEntityForm(entityName);
    // const entityMetrics = useEntityMetrics(entityName);
    const entitySelection = useEntitySelection(entityName);
    const entityToasts = useEntityToasts(entityName);
    const fetchRecords = useFetchRecords(entityName);
    const quickReference = useQuickReference(entityName);
    const validation = useEntityValidation(entityName);

    React.useEffect(() => {
        onInitialized(entityName, {
            activeRecords,
            entity,
            entityAnalyzer,
            entityCrud,
            entityForm,
            // entityMetrics,
            entitySelection,
            entityToasts,
            fetchRecords,
            quickReference,
            validation,
            relationships: {
                direct: relationshipManager.getDirectRelationships(entityName),
                inverse: relationshipManager.getInverseRelationships(entityName),
                all: relationshipManager.getAllRelatedEntities(entityName)
            }
        });
    }, [entityName, onInitialized, relationshipManager]);

    return null;
}

// Hook to access entities
export function useEntities() {
    const context = useContext(EntityContext);
    if (!context) {
        throw new Error('useEntities must be used within EntityProvider');
    }
    return context;
}

// Hook to access relationship manager if needed directly
export function useRelationshipManager() {
    const context = useContext(RelationshipContext);
    if (!context) {
        throw new Error('useRelationshipManager must be used within EntityProvider');
    }
    return context;
}