import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { AutomationEntity, EntityData, EntityKeys } from "@/types/entityTypes";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";

export type EntitySliceState<TEntity extends EntityKeys> = {
  data: Array<EntityData<TEntity>>;
  totalCount: number;
  allPkAndDisplayFields: Array<{ pk: string; display?: string }>;
  initialized: boolean;
  loading: boolean;
  error: { message: string; code?: number } | null;
  lastFetched: Record<string, Date>;
  staleTime: number;
  stale: boolean;
  backups: Record<string, Array<EntityData<TEntity>>>;
  selectedItem: EntityData<TEntity> | null;
  entitySchema?: AutomationEntity<EntityKeys>;
  page: number;
  pageSize: number;
  maxCount?: number;
};

export function createEntitySlice<TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema?: AutomationEntity<TEntity>
  ) {
    const initialState: EntitySliceState<TEntity> = {
      data: [],
      totalCount: 0,
      allPkAndDisplayFields: [],
      initialized: false,
      loading: false,
      error: null,
      lastFetched: {},
      staleTime: 600000,
      stale: true,
      backups: {},
      selectedItem: null,
      entitySchema: schema,
      page: 1,
      pageSize: 10,
      maxCount: 1000,
    };

    const entityActions = createEntityActions(entityKey);

    const slice = createSlice({
      name: `ENTITIES/${entityKey.toUpperCase()}`,
      initialState,
      reducers: {
        setLoading: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<boolean>
        ) => {
          state.loading = action.payload;
        },
        setError: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<{ message: string; code?: number } | null>
        ) => {
          state.error = action.payload;
        },
        setTableData: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<Array<EntityData<TEntity>>>
        ) => {
          state.data = action.payload as Draft<Array<EntityData<TEntity>>>;
          state.loading = false;
          state.error = null;
        },
        setPaginatedData: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<{
            data: Array<EntityData<TEntity>>;
            page: number;
            pageSize: number;
            totalCount: number;
            maxCount?: number;
          }>
        ) => {
          state.data = action.payload.data as Draft<Array<EntityData<TEntity>>>;
          state.page = action.payload.page;
          state.pageSize = action.payload.pageSize;
          state.totalCount = action.payload.totalCount;
          state.loading = false;
          state.error = null;
        },
        setSelectedItem: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<EntityData<TEntity> | null>
        ) => {
          state.selectedItem = action.payload as Draft<EntityData<TEntity>> | null;
        },
        setLastFetched: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<{ key: string; time: number }>
        ) => {
          state.lastFetched[action.payload.key] = new Date(action.payload.time);
        },
        setPage: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<number>
        ) => {
          state.page = action.payload;
        },
        setPageSize: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<number>
        ) => {
          state.pageSize = action.payload;
        },
        setBackup: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<{ key: string; data: Array<EntityData<TEntity>> }>
        ) => {
          state.backups[action.payload.key] = action.payload.data as Draft<
            Array<EntityData<TEntity>>
          >;
        },
        setAllPkAndDisplayFields: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<Array<{ pk: string; display?: string }>>
        ) => {
          state.allPkAndDisplayFields = action.payload as Draft<
            Array<{ pk: string; display?: string }>
          >;
        },
        setStale: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<boolean>
        ) => {
          state.stale = action.payload;
        },
        initializeTable: (state) => {
          state.initialized = true;
        },
      },
      extraReducers: (builder) => {
        builder
          // Existing cases
          .addCase(entityActions.fetchRequest, (state) => {
            state.loading = true;
            state.error = null;
          })
          .addCase(entityActions.fetchSuccess, (state, action) => {
            state.loading = false;
            state.data = action.payload;
            state.stale = false;
          })
          .addCase(entityActions.fetchFailure, (state, action) => {
            state.loading = false;
            state.error = { message: action.payload.message, code: action.payload.code };
          })
          // Add paginated fetch cases
          .addCase(entityActions.fetchPaginatedRequest, (state) => {
            console.log("Reducer handling fetchPaginatedRequest");

            state.loading = true;
            state.error = null;
          })
          .addCase(entityActions.fetchPaginatedSuccess, (state, action) => {
            console.log("Reducer handling fetchPaginatedSuccess:", action.payload);

            state.loading = false;
            state.data = action.payload.data;
            state.page = action.payload.page;
            state.pageSize = action.payload.pageSize;
            state.totalCount = action.payload.totalCount;
            if (action.payload.maxCount) {
              state.maxCount = action.payload.maxCount;
            }
            state.error = null;
            state.stale = false;
          })
          .addCase(entityActions.fetchPaginatedFailure, (state, action) => {
            state.loading = false;
            state.error = { message: action.payload.message, code: action.payload.code };
          })
          // Rest of existing cases
          .addCase(entityActions.fetchOneRequest, (state) => {
            state.loading = true;
            state.error = null;
          })
          .addCase(entityActions.fetchOneSuccess, (state, action) => {
            state.loading = false;
            state.selectedItem = action.payload;
          })
          .addCase(entityActions.fetchOneFailure, (state, action) => {
            state.loading = false;
            state.error = { message: action.payload.message, code: action.payload.code };
          })
          .addCase(entityActions.createRequest, (state) => {
            state.loading = true;
            state.error = null;
          })
          .addCase(entityActions.createSuccess, (state, action) => {
            state.loading = false;
            state.data = [...state.data, action.payload];
          })
          .addCase(entityActions.createFailure, (state, action) => {
            state.loading = false;
            state.error = { message: action.payload.message, code: action.payload.code };
          });
      },
    });

    const combinedActions = {
      ...slice.actions,
      ...entityActions,
    };

    return {
      reducer: slice.reducer,
      actions: combinedActions,
    };
  }
