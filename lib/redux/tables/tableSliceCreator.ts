import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { QueryOptions } from '@/utils/supabase/api-wrapper';
import {
    TableSchema,
    AutomationType, UnwrapTypeBrand,
} from '@/types/AutomationTypes';
import { AutomationTableName } from '@/types/AutomationSchemaTypes';

// Helper type to extract the actual data type from a table schema
export type ExtractTableData<T extends AutomationTableName> = {
    [K in keyof AutomationType<T>['entityFields']]: UnwrapTypeBrand<
        AutomationType<T>['entityFields'][K]['typeReference']
    >
};

export interface TableState<T extends AutomationTableName> {
    data: ExtractTableData<T>[];
    allIdAndNames: { id: string; name: string }[];
    totalCount: number;
    lastFetched: Record<string, number>;
    staleTime: number;
    selectedItem: ExtractTableData<T> | null;
    loading: boolean;
    error: string | null;
}

export function createTableSlice<T extends AutomationTableName>(
    tableName: T,
    schema: TableSchema<T>,
    staleTime: number = 600000,
    additionalReducers: Record<string, any> = {}
) {
    type TableData = ExtractTableData<T>;

    const initialState: TableState<T> = {
        data: [],
        allIdAndNames: [],
        totalCount: 0,
        lastFetched: {},
        staleTime,
        selectedItem: null,
        loading: false,
        error: null,
    };

    const baseType = schema.entityNameVariations.frontend.toUpperCase();

    const customReducers = createCustomReducers<T>(schema);

    const slice = createSlice({
        name: baseType,
        initialState,
        reducers: {
            setLoading: (state) => {
                state.loading = true;
                state.error = null;
            },
            setError: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },
            fetchSuccess: (state, action: PayloadAction<TableData[]>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            },
            fetchOneSuccess: (state, action: PayloadAction<TableData>) => {
                state.loading = false;
                state.selectedItem = action.payload;
                state.error = null;
            },
            createSuccess: (state, action: PayloadAction<TableData>) => {
                state.loading = false;
                state.data.push(action.payload);
                state.error = null;
            },
            updateSuccess: (state, action: PayloadAction<TableData>) => {
                state.loading = false;
                const index = state.data.findIndex(item => item.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = action.payload;
                }
                if (state.selectedItem && state.selectedItem.id === action.payload.id) {
                    state.selectedItem = action.payload;
                }
                state.error = null;
            },
            deleteSuccess: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.data = state.data.filter(item => item.id !== action.payload);
                if (state.selectedItem && state.selectedItem.id === action.payload) {
                    state.selectedItem = null;
                }
                state.error = null;
            },
            executeCustomQuerySuccess: (state, action: PayloadAction<TableData[]>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            },
            ...customReducers,
        },
    });

    const customActions = createCustomActions(schema, baseType);

    // Type-safe actions
    const actions = {
        ...slice.actions,
        fetch: (options?: QueryOptions<TableData>) => ({
            type: `${baseType}/FETCH`,
            payload: options
        }),
        fetchOne: (id: string, options?: Omit<QueryOptions<TableData>, 'limit' | 'offset'>) => ({
            type: `${baseType}/FETCH_ONE`,
            payload: { id, options }
        }),
        create: (data: Partial<TableData>) => ({
            type: `${baseType}/CREATE`,
            payload: data
        }),
        update: (id: string, data: Partial<TableData>) => ({
            type: `${baseType}/UPDATE`,
            payload: { id, data }
        }),
        delete: (id: string) => ({
            type: `${baseType}/DELETE`,
            payload: id
        }),
        executeCustomQuery: (query: (baseQuery: any) => any) => ({
            type: `${baseType}/EXECUTE_QUERY`,
            payload: query
        }),
        ...customActions,
    };

    return {
        reducer: slice.reducer,
        actions,
    };
}

// Helper function to create custom reducers based on schema
function createCustomReducers<T extends AutomationTableName>(
    schema: TableSchema<T>
) {
    type TableData = ExtractTableData<T>;
    const customReducers: Record<string, any> = {};

    // Check for specific fields in the schema and add corresponding reducers
    if ('status' in schema.entityFields) {
        customReducers.changeStatusSuccess = (
            state: TableState<T>,
            action: PayloadAction<TableData>
        ) => {
            const index = state.data.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            }
            if (state.selectedItem && state.selectedItem.id === action.payload.id) {
                state.selectedItem = action.payload;
            }
            state.loading = false;
            state.error = null;
        };
    }

    return customReducers;
}

// Helper function to create custom actions based on schema
function createCustomActions<T extends AutomationTableName>(
    schema: TableSchema<T>,
    baseType: string
) {
    type TableData = ExtractTableData<T>;
    const customActions: Record<string, any> = {};

    if ('status' in schema.entityFields) {
        customActions.changeStatus = (id: string, status: TableData['status']) => ({
            type: `${baseType}/CHANGE_STATUS`,
            payload: { id, status },
        });
    }

    return customActions;
}

export type TableActions<T extends AutomationTableName> = ReturnType<typeof createTableSlice<T>>['actions'];
