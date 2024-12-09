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
            records: { title: "Records", data: entityState.records },
            unsavedRecords: { title: "Unsaved Records", data: entityState.unsavedRecords },
            pendingOperations: { title: "Pending Operations", data: entityState.pendingOperations },
            quickReference: { title: "Quick Reference", data: entityState.quickReference },
            entityMetadata: { title: "Entity Metadata", data: entityState.entityMetadata },
            pagination: { title: "Pagination State", data: entityState.pagination },
            loading: { title: "Loading State", data: entityState.loading },
            cache: { title: "Cache State", data: entityState.cache },
            history: { title: "History State", data: entityState.history },
            filters: { title: "Filter State", data: entityState.filters },
            subscription: { title: "Subscription Config", data: entityState.subscription },
            metrics: { title: "Entity Metrics", data: entityState.metrics }
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
    };
};
