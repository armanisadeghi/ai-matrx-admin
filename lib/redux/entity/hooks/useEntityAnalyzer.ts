import { useState, useEffect } from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';
import { useAppSelector } from '@/lib/redux/hooks';

interface EntityStateSection {
    title: string;
    data: any;
}

interface EntityAnalyzerState {
    selectedEntityKey: EntityKeys | null;
    entityOptions: Array<{ value: EntityKeys; label: string }>;
    sections: Array<{
        id: string;
        title: string;
        data: any;
        allowMinimize: boolean;
    }>;
}

// interface EntityState<TEntity extends EntityKeys> {
//     entityMetadata: EntityMetadata; // Field info is here: entityMetadata.fields has this: EntityStateField[]
//     records: Record<MatrxRecordId, EntityData<TEntity>>
//     unsavedRecords: Record<MatrxRecordId, Partial<EntityData<TEntity>>>;
//     pendingOperations: MatrxRecordId[]; // Array instead of Set
//     quickReference: QuickReferenceState;
//     selection: SelectionState;
//     pagination: PaginationState;
//     loading: LoadingState;
//     cache: CacheState;
//     history: HistoryState<TEntity>;
//     filters: FilterState;
//     subscription: SubscriptionConfig;
//     flags: EntityFlags;
//     metrics: EntityMetrics;
//     parentEntityField?: string;
//     activeParentId?: string;
//     runtimeFilters?: RuntimeFilter[];
//     runtimeSort?: RuntimeSort;
//     socketEventName?: string;
//     customData?: Record<string, unknown>;

// }


export const useEntityAnalyzer = (
    initialEntityKey?: EntityKeys | null
) => {
    const [selectedEntityKey, setSelectedEntityKey] = useState<EntityKeys | null>(
        initialEntityKey ?? null
    );
    const [isViewingEntity, setIsViewingEntity] = useState<boolean>(!!initialEntityKey);

    const entityOptions = useAppSelector(selectFormattedEntityOptions);
    const entityState = useAppSelector((state) =>
        selectedEntityKey ? state.entities[selectedEntityKey] : null
    );

    const getEntitySections = (): EntityAnalyzerState['sections'] => {
        if (!entityState) return [];

        const stateMap: Record<string, EntityStateSection> = {
            selection: { title: "Selection State", data: entityState.selection },
            flags: { title: "Entity Flags", data: entityState.flags },
            unsavedRecords: { title: "Unsaved Records", data: entityState.unsavedRecords },
            records: { title: "Records", data: entityState.records },
            parentInfo: { title: "Parent Info", data: { parentEntityField: entityState.parentEntityField, activeParentId: entityState.activeParentId } },
            socket: { title: "Socket Event", data: entityState.socketEventName },
            customData: { title: "Custom Data", data: entityState.customData },
            runtimeFilters: { title: "Runtime Filters", data: entityState.runtimeFilters },
            runtimeSort: { title: "Runtime Sort", data: entityState.runtimeSort },
            quickReference: { title: "Quick Reference", data: entityState.quickReference },
            pendingOperations: { title: "Pending Operations", data: entityState.pendingOperations },
            entityMetadata: { title: "Entity Metadata", data: entityState.entityMetadata },
            pagination: { title: "Pagination State", data: entityState.pagination },
            loading: { title: "Loading State", data: entityState.loading },
            cache: { title: "Cache State", data: entityState.cache },
            history: { title: "History State", data: entityState.history },
            filters: { title: "Filter State", data: entityState.filters },
            subscription: { title: "Subscription Config", data: entityState.subscription },
            metrics: { title: "Entity Metrics", data: entityState.metrics },

        };

        return Object.entries(stateMap)
            .filter(([_, value]) => value.data !== undefined)
            .map(([key, value]) => ({
                id: key,
                title: value.title,
                data: value.data,
                allowMinimize: true
            }));
    };

    const entityDisplayName = entityState?.entityMetadata.displayName;
    const sections = getEntitySections();

    const selectEntity = (entityKey: EntityKeys | null) => {
        setSelectedEntityKey(entityKey);
        setIsViewingEntity(!!entityKey);
    };

    const showEntityList = () => {
        setIsViewingEntity(false);
    };

    return {
        // State
        selectedEntityKey,
        entityOptions,
        sections,
        isViewingEntity,

        // Entity label helper
        getEntityLabel: (entityKey: EntityKeys) =>
            entityOptions.find(e => e.value === entityKey)?.label,

        // Actions
        selectEntity,
        showEntityList,

        // Raw state access if needed
        rawEntityState: entityState,
        
        // Newly added
        entityDisplayName,
    };
};
