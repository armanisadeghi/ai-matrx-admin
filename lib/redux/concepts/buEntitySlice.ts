/*
import {ActionReducerMapBuilder, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AutomationEntity, EntityKeys, ExtractType} from "@/types/entityTypes";
import {DeleteResponse, PaginatedResponse, SliceState} from "@/types/reduxTypes";


/!**
 * Builds the data structure type from entity fields
 *!/
type EntityData<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
                                                                  ? TField
                                                                  : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
                                                                  ? TField
                                                                  : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
};

type registeredFunction = EntityData<'registeredFunction'>;
type userPreferences = EntityData<'userPreferences'>;


export type EntitySliceState<TEntity extends EntityKeys> = {
    data: EntityData<TEntity>[]; // Object array of Record<FieldKey, TypeReference> (The actual data)
    totalCount: number; // Total number must come from the first fetch operation.
    allPkAndDisplayFields: Array<{  // Also fetched with the first fetch operation
        pk: string;  // Derived from the primary key field of the entity (Must convert to string)
        display?: string;  // Derived from the display field of the entity (Must convert to string)
    }>;
    initialized: boolean;
    loading: boolean;
    error: string | null;
    lastFetched: Date;
    staleTime: number;
    backups: Record<string, EntityData<TEntity>[]>; // Backup of previous data states (When necessary and triggered)
    selectedItem: EntityData<TEntity> | null;   // Tracks the ACTIVE row (record) in the entity
    entitySchema: AutomationEntity<EntityKeys>;  // The only remaining thing about the entity schema system!
};

export function createEntitySlice<TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema: AutomationEntity<TEntity>
) {
    const initialState: EntitySliceState<TEntity> = {
        data: [],
        totalCount: 0,
        allPkAndDisplayFields: [],
        initialized: false,
        loading: false,
        error: null,
        lastFetched: new Date(),
        staleTime: 600000,
        backups: {},
        selectedItem: null,
        entitySchema: schema,  // This is not for us. It's for APIs, Hooks, and others who need it.
    };

    const slice = createSlice({
        name: entityKey.toUpperCase(),
        initialState,
        reducers: {
            initializeTable: (state) => {
                state.initialized = true;
            },
            setTableData: (state, action: PayloadAction<EntityData<TEntity>[]>) => {
                state.data = action.payload;
                state.loading = false;
                state.error = null;
            },
            setSelectedItem: (
                state,
                action: PayloadAction<any>
            ) => {
                state.selectedItem = action.payload;
                state.loading = false;
                state.error = null;
            },
            setLoading: (state, action: PayloadAction<boolean>) => {
                state.loading = action.payload;
                if (action.payload) {
                    state.error = null;
                }
            },
            markDataStale: (state, action: PayloadAction<string>) => {
                delete state.lastFetched[action.payload];
            },
            updateOptimistic: (state, action: PayloadAction<EntitySliceState<TEntity>>) => {
                const id = action.payload.id;
                state.backups[id] = state.items[id];
                state.items[id] = action.payload;
            },
            revertOptimisticUpdate: (state, action: PayloadAction<string>) => {
                const id = action.payload;
                if (state.backups[id]) {
                    state.items[id] = state.backups[id];
                    delete state.backups[id];
                }
            },
            addOptimistic: (state, action: PayloadAction<EntitySliceState<TEntity>>) => {
                const id = action.payload.id;
                state.backups[id] = state.items[id];
                state.items[id] = action.payload;
                state.allIdAndNames.push({ id: action.payload.id, name: action.payload.name });
                state.totalCount += 1;
            },
            removeOptimistic: (state, action: PayloadAction<string>) => {
                const id = action.payload;
                state.backups[id] = state.items[id];
                delete state.items[id];
                state.allIdAndNames = state.allIdAndNames.filter(item => item.id !== id);
                state.totalCount -= 1;
            },
            replaceOptimistic: (state, action: PayloadAction<{ tempId: string, realEntity: EntitySliceState<TEntity> }>) => {
                const { tempId, realEntity } = action.payload;
                state.backups[realEntity.id] = state.items[realEntity.id];
                delete state.items[tempId];
                state.items[realEntity.id] = realEntity;
                const index = state.allIdAndNames.findIndex(item => item.id === tempId);
                if (index !== -1) {
                    state.allIdAndNames[index] = { id: realEntity.id, name: realEntity.name };
                }
            },

            setError: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },
            setTotalCount: (state, action: PayloadAction<number>) => {
                state.totalCount = action.payload;
            },
            setLastFetched: (
                state,
                action: PayloadAction<{ key: string; time: number }>
            ) => {
                state.lastFetched[action.payload.key] = action.payload.time;
            },
            removeLastFetchedKey: (state, action: PayloadAction<string>) => {
                delete state.lastFetched[action.payload];
            },
            setPaginatedData: (
                state,
                action: PayloadAction<{ data: EntityData<TEntity>[]; totalCount: number }>
            ) => {
                //                 data: result.data,
                //                 page: result.page,
                //                 pageSize: result.pageSize,
                //                 totalCount: result.totalCount,
                //                 maxCount: result.maxCount


                state.data = action.payload.data;
                state.page = action.payload.page;
                state.totalCount = action.payload.totalCount;
                state.loading = false;
                state.error = null;
            },
            fetch: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchOne: (state) => {
                state.loading = true;
                state.error = null;
            },
            create: (state) => {
                state.loading = true;
                state.error = null;
            },
            update: (state) => {
                state.loading = true;
                state.error = null;
            },
            delete: (state) => {
                state.loading = true;
                state.error = null;
            },
            executeQuery: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchPaginated: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchByPrimaryKey: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchByField: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchSimple: (state) => {
                state.loading = true;
                state.error = null;
            },
            subscribeToChanges: (state) => {
                state.loading = true;
                state.error = null;
            },
            unsubscribeFromChanges: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchAll: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchPkAndDisplayFields: (state) => {
                state.loading = true;
                state.error = null;
            },
            createBackup: (state) => {
                state.loading = true;
                state.error = null;
            },
            restoreBackup: (state) => {
                state.loading = true;
                state.error = null;
            },
            ...additionalReducers,
        },
        extraReducers: (builder: ActionReducerMapBuilder<SliceState<EntitySliceState<TEntity>>>) => {
            const handleFetchOneFulfilled = (state: SliceState<EntitySliceState<TEntity>>, action: PayloadAction<EntitySliceState<TEntity>>) => {
                const validatedItem = action.payload;
                state.loading = false;
                state.items[validatedItem.id] = validatedItem;
                state.lastFetched[validatedItem.id] = Date.now();
            };

            const handleFetchPaginatedFulfilled = (state: SliceState<EntitySliceState<TEntity>>, action: PayloadAction<PaginatedResponse<EntitySliceState<TEntity>>>) => {
                console.log('handleFetchPaginatedFulfilled called with payload:', JSON.stringify(action.payload, null, 2));

                const { paginatedData, allIdAndNames, totalCount } = action.payload;

                console.log('Updating state with paginatedData:', JSON.stringify(paginatedData, null, 2));
                paginatedData.forEach(item => {
                    const validatedItem = EntitySliceState<TEntity>.parse(item);
                    state.items[validatedItem.id] = validatedItem;
                    state.lastFetched[validatedItem.id] = Date.now();
                });

                console.log('Updating state with allIdAndNames:', JSON.stringify(allIdAndNames, null, 2));
                state.allIdAndNames = allIdAndNames;
                console.log('Updating state with totalCount:', totalCount);
                state.totalCount = totalCount;
                state.loading = false;

                console.log('State after update:', JSON.stringify(state, null, 2));
            };

            const handleDeleteOneFulfilled = (state: SliceState<EntitySliceState<TEntity>>, action: PayloadAction<DeleteResponse>) => {
                const deletedId = action.payload.deletedIds[0];
                delete state.items[deletedId];
                state.allIdAndNames = state.allIdAndNames.filter(item => item.id !== deletedId);
                state.totalCount -= 1;
                delete state.lastFetched[deletedId];
                state.loading = false;
            };

            const handleDeleteManyFulfilled = (state: SliceState<EntitySliceState<TEntity>>, action: PayloadAction<DeleteResponse>) => {
                action.payload.deletedIds.forEach((id) => {
                    delete state.items[id];
                    delete state.lastFetched[id];
                });
                state.allIdAndNames = state.allIdAndNames.filter(item => !action.payload.deletedIds.includes(item.id));
                state.totalCount -= action.payload.deletedIds.length;
                state.loading = false;
            };

            const handleUpdateFulfilled = (state: SliceState<EntitySliceState<TEntity>>, action: PayloadAction<EntitySliceState<TEntity>>) => {
                const updatedEntity = action.payload;
                state.items[updatedEntity.id] = updatedEntity;
                const index = state.allIdAndNames.findIndex(item => item.id === updatedEntity.id);
                if (index !== -1) {
                    state.allIdAndNames[index].name = updatedEntity.name;
                }
                state.lastFetched[updatedEntity.id] = Date.now();
                state.loading = false;
            };
            builder.addCase(slice.actions.fetchOne.fulfilled, handleFetchOneFulfilled);
            builder.addCase(slice.actions.fetchPaginated.fulfilled, handleFetchPaginatedFulfilled);
            builder.addCase(slice.actions.deleteOne.fulfilled, handleDeleteOneFulfilled);
            builder.addCase(slice.actions.deleteMany.fulfilled, handleDeleteManyFulfilled);
            builder.addCase(slice.actions.update.fulfilled, handleUpdateFulfilled);
        }
    });
    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
}
*/
