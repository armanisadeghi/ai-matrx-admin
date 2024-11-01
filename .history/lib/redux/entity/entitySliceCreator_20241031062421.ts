import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { AutomationEntity, EntityData, EntityKeys } from "@/types/entityTypes";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";

export type EntitySliceState<TEntity extends EntityKeys> = {
  data: Array<EntityData<TEntity>>;
  totalCount: number; // Total number of records
  allPkAndDisplayFields: Array<{ pk: string; display?: string }>; // Primary and display fields
  initialized: boolean;
  loading: boolean;
  error: { message: string; code?: number } | null;
  lastFetched: Record<string, Date>; // Stores last fetched time by primary key
  staleTime: number; // Stale time for data validity
  stale: boolean; // Flag to indicate stale data
  backups: Record<string, Array<EntityData<TEntity>>>; // Backups for undo/history functionality
  selectedItem: EntityData<TEntity> | null; // The active selected item
  entitySchema?: AutomationEntity<EntityKeys>; // Includes all relationships
  page: number; // Current page number for pagination
  pageSize: number; // Number of records per page
  maxCount?: number; // Maximum number of records to fetch
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
  
    // Create action types and action creators specific to this entity
    const entityActions = createEntityActions(entityKey);
  
    // Create the slice with reducers
    const slice = createSlice({
      name: `ENTITIES/${entityKey.toUpperCase()}`,
      initialState,
      reducers: {
        // Reducers for updating state based on actions
        setLoading: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<boolean>
        ) => {
          state.loading = action.payload;
        },
        setError: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<string | null>
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
        // You can add more reducers as needed
      },
      // Use extraReducers to handle actions from entityActions
      extraReducers: (builder) => {
        builder
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
            state.error = action.payload.message;
          })
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
            state.error = action.payload.message;
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
            state.error = action.payload.message;
          });
        // Handle other actions similarly...
      },
    });
  
    // Combine slice actions and entity actions
    const combinedActions = {
      ...slice.actions,
      ...entityActions,
    };
  
    return {
      reducer: slice.reducer,
      actions: combinedActions,
    };
  }
  