import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InferSchemaType, TableSchema, SchemaTypes, TableNames } from "@/types/tableSchemaTypes";
import { QueryOptions } from '@/utils/supabase/api-wrapper';
import { initialSchemas } from "@/utils/schema/initialSchemas";

export interface TableState<T extends TableSchema> {
    data: InferSchemaType<T>[];
    selectedItem: InferSchemaType<T> | null;
    loading: boolean;
    error: string | null;
}

export function createTableSlice<K extends TableNames>(
    tableName: K,
    schema: TableSchema
) {
    type Schema = typeof schema;
    type Data = SchemaTypes[K];

    const initialState: TableState<Schema> = {
        data: [],
        selectedItem: null,
        loading: false,
        error: null,
    };

    const baseType = schema.name.frontend.toUpperCase();

    const customReducers = createCustomReducers<K>(schema);

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
            fetchSuccess: (state, action: PayloadAction<Data[]>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            },
            fetchOneSuccess: (state, action: PayloadAction<Data>) => {
                state.loading = false;
                state.selectedItem = action.payload;
                state.error = null;
            },
            createSuccess: (state, action: PayloadAction<Data>) => {
                state.loading = false;
                state.data.push(action.payload);
                state.error = null;
            },
            updateSuccess: (state, action: PayloadAction<Data>) => {
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
            executeCustomQuerySuccess: (state, action: PayloadAction<Data[]>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            },
            ...customReducers,
        },
    });

    const customActions = createCustomActions<K>(schema, baseType);
    const actions = {
        ...slice.actions,
        fetch: (options?: QueryOptions<K>) => ({ type: `${baseType}/FETCH`, payload: options }),
        fetchOne: (id: string, options?: Omit<QueryOptions<K>, 'limit' | 'offset'>) => ({
            type: `${baseType}/FETCH_ONE`,
            payload: { id, options }
        }),
        create: (data: Partial<Data>) => ({ type: `${baseType}/CREATE`, payload: data }),
        update: (id: string, data: Partial<Data>) => ({ type: `${baseType}/UPDATE`, payload: { id, data } }),
        delete: (id: string) => ({ type: `${baseType}/DELETE`, payload: id }),
        executeCustomQuery: (query: (baseQuery: any) => any) => ({ type: `${baseType}/EXECUTE_QUERY`, payload: query }),
        ...customActions,
    };

    return {
        reducer: slice.reducer,
        actions,
    };
}

function createCustomReducers<K extends TableNames>(schema: TableSchema) {
    type Data = SchemaTypes[K];
    const customReducers: Record<string, any> = {};

    if ('status' in schema.fields) {
        customReducers.changeStatusSuccess = (
            state: TableState<TableSchema>,
            action: PayloadAction<Data>
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

function createCustomActions<K extends TableNames>(schema: TableSchema, baseType: string) {
    type Data = SchemaTypes[K];
    const customActions: Record<string, any> = {};

    if ('status' in schema.fields) {
        customActions.changeStatus = (id: string, status: Data['status']) => ({
            type: `${baseType}/CHANGE_STATUS`,
            payload: { id, status },
        });
    }

    return customActions;
}

export type TableActions<K extends TableNames> = ReturnType<typeof createTableSlice<K>>['actions'];
