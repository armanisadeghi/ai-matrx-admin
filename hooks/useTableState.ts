import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import debounce from 'lodash/debounce';
import {createEntityActions} from '@/lib/redux/entity/entityActionCreator';
import {createEntitySelectors} from '@/lib/redux/entity/entitySelectors';
import {
    EntityKeys,
    EntityData,
    AutomationEntity
} from '@/types/entityTypes';
import {
    SchemaTableState,
    SchemaColumnDef,
    TableStateHookResult,
    EnhancedModalState,
    TableComponentState
} from '@/types/tableTypes';

// Core table state management
export function useSchemaTableState<TEntity extends EntityKeys>(
    {
        entityKey,
        initialState,
        features,
        stateChangeDelay = 300
    }: {
        entityKey: TEntity;
        initialState?: Partial<SchemaTableState<TEntity>>;
        features?: {
            serverSide?: {
                pagination?: boolean;
                sorting?: boolean;
                filtering?: boolean;
                search?: boolean;
            };
        };
        stateChangeDelay?: number;
    }) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const entitySelectors = createEntitySelectors(entityKey);
    const schema = useAppSelector(state => state.globalCache.schema[entityKey]);

    // Core state selectors
    const {
        data,
        loading,
        error,
        totalCount,
        selectedItem
    } = useAppSelector(state => ({
        data: entitySelectors.selectData(state),
        loading: entitySelectors.selectLoading(state),
        error: entitySelectors.selectError(state),
        totalCount: entitySelectors.selectTotalCount(state),
        selectedItem: entitySelectors.selectSelectedItem(state)
    }));

    // URL sync and state updates
    const updateState = useCallback(
        debounce((newState: Partial<SchemaTableState<TEntity>>) => {
            const params = new URLSearchParams(searchParams);
            Object.entries(newState).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.set(key, JSON.stringify(value));
                }
            });
            router.push(`?${params.toString()}`, {scroll: false});

            // Dispatch appropriate actions based on what changed
            if ('pagination' in newState) {
                dispatch(createEntityActions(entityKey).fetchPaginatedRequest({
                    page: newState.pagination.page,
                    pageSize: newState.pagination.pageSize,
                    options: createQueryOptions(newState)
                }));
            }
            // Handle other state updates...
        }, stateChangeDelay),
        [entityKey, router, searchParams]
    );

    return {
        state: {
            entityKey,
            data,
            loading,
            error,
            totalCount,
            selectedItem
        },
        schema,
        updateState
    };
}

// Relationship management
export function useTableRelationships<TEntity extends EntityKeys>(
    {
        entityKey,
        relationships,
        parentState
    }: {
        entityKey: TEntity;
        relationships: AutomationEntity<TEntity>['relationships'];
        parentState: SchemaTableState<TEntity>;
    }) {
    const [relationshipStates, setRelationshipStates] = useState<Record<string, {
        loaded: boolean;
        loading: boolean;
        data: any[];
        error?: any;
    }>>({});

    const loadRelationship = useCallback(async (relationshipKey: string) => {
        setRelationshipStates(prev => ({
            ...prev,
            [relationshipKey]: {...prev[relationshipKey], loading: true}
        }));

        try {
            // Implement relationship loading logic
        } catch (error) {
            setRelationshipStates(prev => ({
                ...prev,
                [relationshipKey]: {
                    ...prev[relationshipKey],
                    loading: false,
                    error
                }
            }));
        }
    }, [entityKey]);

    return {
        states: relationshipStates,
        loadRelationship
    };
}

// Component state management
export function useTableComponents<TEntity extends EntityKeys>(
    {
        entityKey,
        initialComponentState
    }: {
        entityKey: TEntity;
        initialComponentState?: Partial<TableComponentState>;
    }) {
    const [componentState, setComponentState] = useState<TableComponentState>({
        modal: {
            isOpen: false,
            type: null,
            activeTab: null,
            data: null
        },
        toolbar: {
            searchValue: '',
            activeFilters: {},
            customActions: {}
        },
        body: {
            selectedRows: {},
            expandedRows: {},
            loadingRows: {}
        },
        footer: {
            pagination: {
                currentPage: 1,
                pageSize: 10,
                totalPages: 1
            }
        }
    });

    const updateComponentState = useCallback((
        updates: Partial<TableComponentState>
    ) => {
        setComponentState(prev => ({
            ...prev,
            ...updates
        }));
    }, []);

    return {
        componentState,
        updateComponentState
    };
}

// Main hook that combines everything
export function useEnhancedTable<TEntity extends EntityKeys>(
    {
        entityKey,
        initialState,
        features,
        relationships,
        stateChangeDelay
    }: {
        entityKey: TEntity;
        initialState?: Partial<SchemaTableState<TEntity>>;
        features?: {
            serverSide?: {
                pagination?: boolean;
                sorting?: boolean;
                filtering?: boolean;
                search?: boolean;
            };
            relationships?: {
                eager?: string[];
                lazy?: string[];
            };
        };
        relationships?: AutomationEntity<TEntity>['relationships'];
        stateChangeDelay?: number;
    }): TableStateHookResult<TEntity> {
    // Combine all hooks
    const {
        state: tableState,
        schema,
        updateState
    } = useSchemaTableState({
        entityKey,
        initialState,
        features,
        stateChangeDelay
    });

    const {
        states: relationshipStates,
        loadRelationship
    } = useTableRelationships({
        entityKey,
        relationships,
        parentState: tableState
    });

    const {
        componentState,
        updateComponentState
    } = useTableComponents({
        entityKey
    });

    // Create action handlers
    const actions = useMemo(() => ({
        table: {
            refresh: () => updateState(tableState),
            reset: () => updateState(initialState),
        },
        rows: {
            select: (ids: string[]) => {
                updateComponentState({
                    body: {
                        ...componentState.body,
                        selectedRows: ids.reduce((acc, id) => ({
                            ...acc,
                            [id]: true
                        }), {})
                    }
                });
            },
            // Add other row actions...
        },
        modal: {
            open: (type: string, data?: any) => {
                updateComponentState({
                    modal: {
                        isOpen: true,
                        type,
                        data,
                        activeTab: 'default'
                    }
                });
            },
            // Add other modal actions...
        },
        // Add other action categories...
    }), [componentState, updateComponentState, updateState]);

    return {
        state: tableState,
        schema,
        relationships: relationshipStates,
        components: {
            state: componentState,
            update: updateComponentState
        },
        actions,
        updateState
    };
}




export function useTableState<TEntity extends EntityKeys>(
    {
        entityKey,
        initialState,
        relationships,
        enableServerOperations,
        stateChangeDelay = 300
    }: {
        entityKey: TEntity;
        initialState?: Partial<ServerSideState>;
        relationships?: RelationshipConfig<EntityKeys>[];
        enableServerOperations?: {
            sorting?: boolean;
            filtering?: boolean;
            search?: boolean;
            pagination?: boolean;
        };
        stateChangeDelay?: number;
    }): TableStateHookResult<TEntity> {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    // Track mounted state for async operations
    const isMounted = useRef(true);
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Create selectors for primary entity
    const entitySelectors = createEntitySelectors(entityKey);

    // Select primary entity state
    const {
        data,
        loading,
        error,
        totalCount,
    } = useAppSelector(state => ({
        data: entitySelectors.selectData(state),
        loading: entitySelectors.selectLoading(state),
        error: entitySelectors.selectError(state),
        totalCount: entitySelectors.selectTotalCount(state),
    }));

    // Track relationship states
    const relationshipStates = useMemo(() => {
        if (!relationships) return {};

        return relationships.reduce((acc, rel) => {
            const relSelectors = createEntitySelectors(rel.entityKey);
            const relState = useAppSelector(state => ({
                data: relSelectors.selectData(state),
                loading: relSelectors.selectLoading(state),
                error: relSelectors.selectError(state),
            }));
            return {...acc, [rel.entityKey]: relState};
        }, {});
    }, [relationships]);

    // Create query options with relationship support
    const createQueryOptions = useCallback((
        state: ServerSideState
    ): UnifiedQueryOptions<TEntity> => {
        const options: UnifiedQueryOptions<TEntity> = {
            tableName: entityKey,
            limit: state.pagination.pageSize,
            offset: state.pagination.pageIndex * state.pagination.pageSize,
            sorts: state.sorting.map(sort => ({
                column: sort.id,
                ascending: !sort.desc,
                ...(sort.entityKey && {table: sort.entityKey})
            })),
            filters: state.filters.reduce((acc, filter) => ({
                ...acc,
                [filter.id]: {
                    value: filter.value,
                    operator: filter.operator,
                    ...(filter.entityKey && {table: filter.entityKey})
                }
            }), {}),
        };

        // Add relationship joins if needed
        if (relationships?.length) {
            options.joinTables = relationships.map(rel => ({
                table: rel.entityKey,
                on: `${rel.joinConfig?.localField} = ${rel.joinConfig?.foreignField}`,
                columns: [rel.displayField, rel.valueField]
            }));
        }

        // Add search configuration
        if (state.search.value) {
            options.fullTextSearch = {
                query: state.search.value,
                column: state.search.fields.join(',')
            };
        }

        return options;
    }, [entityKey, relationships]);

    // Coordinated state update function
    const updateState = useCallback(
        debounce(async (newState: Partial<ServerSideState>) => {
            if (!isMounted.current) return;

            const updatedState = {...tableState, ...newState};

            // Update URL params
            const params = new URLSearchParams(searchParams);
            Object.entries(updatedState).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.set(key, JSON.stringify(value));
                }
            });
            router.push(`?${params.toString()}`, {scroll: false});

            // Create query options
            const queryOptions = createQueryOptions(updatedState as ServerSideState);

            // Dispatch primary entity fetch
            dispatch(createEntityActions(entityKey).fetchPaginatedRequest({
                page: updatedState.pagination.pageIndex + 1,
                pageSize: updatedState.pagination.pageSize,
                options: queryOptions
            }));

            // Handle relationship fetches if needed
            if (relationships?.length) {
                relationships.forEach(rel => {
                    if (updatedState.relationships?.[rel.entityKey]?.loaded === false) {
                        dispatch(createEntityActions(rel.entityKey).fetchRequest({
                            options: {
                                tableName: rel.entityKey,
                                columns: [rel.displayField, rel.valueField]
                            }
                        }));
                    }
                });
            }
        }, stateChangeDelay),
        [tableState, router, dispatch, entityKey, relationships, createQueryOptions]
    );

    return {
        state: tableState,
        data,
        loading,
        error,
        relationships: relationshipStates,
        updateState,
        dispatch,
        selectors: {
            getData: entitySelectors.selectData,
            getLoading: entitySelectors.selectLoading,
            getError: entitySelectors.selectError,
            getTotalCount: entitySelectors.selectTotalCount,
            getRelatedData: (relEntityKey: EntityKeys) =>
                createEntitySelectors(relEntityKey).selectData
        }
    };
}
