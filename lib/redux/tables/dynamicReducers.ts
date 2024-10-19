// lib/redux/tableSagas/tableReducerFactory.ts

import { UnknownAction } from '@reduxjs/toolkit';
import {getSchema} from "@/utils/schema/schemaRegistry";
import {InferFieldTypes, TableSchema} from "@/types/tableSchemaTypes";

interface State<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
}

type ActionType = 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE' | 'CHANGE_STATUS';

function getActionType(baseType: string, action: ActionType, status: 'REQUEST' | 'SUCCESS' | 'FAILURE') {
    return `${baseType}_${action}_${status}`;
}

function isActionOfType(action: UnknownAction, baseType: string, actionType: ActionType, status: 'REQUEST' | 'SUCCESS' | 'FAILURE'): action is { type: string; payload?: any } {
    return action.type === getActionType(baseType, actionType, status);
}

export function createReducer<T extends string>(tableName: T) {
    const schema = getSchema(tableName);
    if (!schema) {
        throw new Error(`No schema found for table: ${tableName}`);
    }

    // Infer the type of our table
    type TableData = InferFieldTypes<typeof schema>;

    // Initial state which uses the inferred type
    const initialState: State<TableData> = {
        data: [],
        loading: false,
        error: null,
    };

    return function reducer(state = initialState, action: UnknownAction): State<TableData> {
        const baseType = tableName.toUpperCase();

        if (isActionOfType(action, baseType, 'FETCH', 'REQUEST') ||
            isActionOfType(action, baseType, 'CREATE', 'REQUEST') ||
            isActionOfType(action, baseType, 'UPDATE', 'REQUEST') ||
            isActionOfType(action, baseType, 'DELETE', 'REQUEST')) {
            return { ...state, loading: true, error: null };
        }

        if (isActionOfType(action, baseType, 'FETCH', 'SUCCESS')) {
            return { ...state, loading: false, data: action.payload, error: null };
        }

        if (isActionOfType(action, baseType, 'CREATE', 'SUCCESS')) {
            return { ...state, loading: false, data: [...state.data, action.payload], error: null };
        }

        if (isActionOfType(action, baseType, 'UPDATE', 'SUCCESS')) {
            return {
                ...state,
                loading: false,
                data: state.data.map(item => item.id === action.payload.id ? action.payload : item),
                error: null,
            };
        }

        if (isActionOfType(action, baseType, 'DELETE', 'SUCCESS')) {
            return {
                ...state,
                loading: false,
                data: state.data.filter(item => item.id !== action.payload),
                error: null,
            };
        }

        if (isActionOfType(action, baseType, 'FETCH', 'FAILURE') ||
            isActionOfType(action, baseType, 'CREATE', 'FAILURE') ||
            isActionOfType(action, baseType, 'UPDATE', 'FAILURE') ||
            isActionOfType(action, baseType, 'DELETE', 'FAILURE')) {
            return { ...state, loading: false, error: action.payload };
        }

        // Pass the action through a custom handler if needed
        return handleCustomActions(state, action, schema);
    };
}

function handleCustomActions<T extends TableSchema>(
    state: State<InferFieldTypes<T>>,
    action: UnknownAction,
    schema: T
): State<InferFieldTypes<T>> {
    const baseType = schema.name.frontend.toUpperCase();

    if (schema.fields.status && action.type.includes('CHANGE_STATUS')) {
        if (isActionOfType(action, baseType, 'CHANGE_STATUS', 'REQUEST')) {
            return { ...state, loading: true, error: null };
        }
        if (isActionOfType(action, baseType, 'CHANGE_STATUS', 'SUCCESS')) {
            return {
                ...state,
                loading: false,
                data: state.data.map(item => item.id === action.payload.id ? action.payload : item),
                error: null,
            };
        }
        if (isActionOfType(action, baseType, 'CHANGE_STATUS', 'FAILURE')) {
            return { ...state, loading: false, error: action.payload };
        }
    }

    // More custom action to be added here...

    return state;
}
