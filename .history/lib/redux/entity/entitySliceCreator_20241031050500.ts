import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { AutomationEntity, EntityData, EntityKeys } from "@/types/entityTypes";

export type EntitySliceState<TEntity extends EntityKeys> = {
  data: Array<EntityData<TEntity>>;
  totalCount: number; // Total number of records
  allPkAndDisplayFields: Array<{ pk: string; display?: string }>; // Primary and display fields
  initialized: boolean;
  loading: boolean;
  error: string | null;
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

export function createEntitySlice<TEntity extends EntityKeys>(entityKey: TEntity) {
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
      page: 1,
      pageSize: 10,
      maxCount: 1000,
    };
  
    const slice = createSlice({
      name: entityKey.toUpperCase(),
      initialState,
      reducers: {
        // Add schema setter action
        setEntitySchema: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<AutomationEntity<EntityKeys>>
        ) => {
          state.entitySchema = action.payload;
        },
        
        // Existing actions
        fetchRequest: (state) => {
          state.loading = true;
        },
        fetchSuccess: (state, action: PayloadAction<any[]>) => {
          state.loading = false;
          state.data = action.payload;
          state.stale = false;
        },
        fetchFailure: (state, action: PayloadAction<Error>) => {
          state.loading = false;
          state.error = action.payload.message;
        },
        createRequest: (state) => {
          state.loading = true;
        },
        createSuccess: (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.data = [...(state.data || []), action.payload];
        },
        createFailure: (state, action: PayloadAction<Error>) => {
          state.loading = false;
          state.error = action.payload.message;
        },
        fetchOneRequest: (state) => {
          state.loading = true;
        },
        fetchOneSuccess: (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.selectedItem = action.payload;
        },
        fetchOneFailure: (state, action: PayloadAction<Error>) => {
          state.loading = false;
          state.error = action.payload.message;
        },
        initializeTable: (state) => {
          state.initialized = true;
        },
        setTableData: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<Array<EntityData<TEntity>>>
        ) => {
          state.data = action.payload;
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
          state.data = action.payload.data;
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
          state.selectedItem = action.payload;
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
        setBackup: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<{ key: string; data: Array<EntityData<TEntity>> }>
        ) => {
          state.backups[action.payload.key] = action.payload.data;
        },
        setAllPkAndDisplayFields: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<Array<{ pk: string; display?: string }>>
        ) => {
          state.allPkAndDisplayFields = action.payload;
        },
        setStale: (
          state: Draft<EntitySliceState<TEntity>>,
          action: PayloadAction<boolean>
        ) => {
          state.stale = action.payload;
        },
      },
    });
  
    return slice;
  }
  