import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TableSchema, InferSchemaType } from "@/utils/schema/schemaRegistry";
import { QueryOptions } from '@/utils/supabase/api-wrapper';
import { initialSchemas } from "@/utils/schema/initialSchemas";

export interface TableState<T extends TableSchema> {
    data: InferSchemaType<T>[];
    selectedItem: InferSchemaType<T> | null;
    loading: boolean;
    error: string | null;
}

export function createTableSlice<K extends keyof typeof initialSchemas>(
    tableName: K,
    schema: TableSchema
) {
    type Schema = typeof schema;
    type Data = InferSchemaType<Schema>;

    const initialState: TableState<Schema> = {
        data: [],
        selectedItem: null,
        loading: false,
        error: null,
    };

    const baseType = schema.name.frontend.toUpperCase();

    const customReducers = createCustomReducers(schema);

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
            executeQuerySuccess: (state, action: PayloadAction<Data[]>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            },
            ...customReducers,
        },
    });

    const customActions = createCustomActions<Schema>(schema, baseType);
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
        executeQuery: (query: (baseQuery: any) => any) => ({ type: `${baseType}/EXECUTE_QUERY`, payload: query }),
        ...customActions,
    };

    return {
        reducer: slice.reducer,
        actions,
    };
}

function createCustomReducers<Schema extends TableSchema>(schema: Schema) {
    const customReducers: Record<string, any> = {};

    if (schema.fields.status) {
        customReducers.changeStatusSuccess = (
            state: TableState<Schema>,
            action: PayloadAction<InferSchemaType<Schema>>
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

function createCustomActions<Schema extends TableSchema>(schema: Schema, baseType: string) {
    const customActions: Record<string, any> = {};

    if (schema.fields.status) {
        customActions.changeStatus = (id: string, status: string) => ({
            type: `${baseType}/CHANGE_STATUS`,
            payload: { id, status },
        });
    }

    return customActions;
}

export type TableActions<K extends keyof typeof initialSchemas> = ReturnType<typeof createTableSlice<K>>['actions'];
