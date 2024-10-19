// lib/redux/tableSagas/tableActionCreator.ts


// Action type constants
import {getSchema} from "@/utils/schema/schemaRegistry";
import {InferFieldTypes, TableSchema} from "@/types/tableSchemaTypes";

type ActionStatus = 'REQUEST' | 'SUCCESS' | 'FAILURE';
type ActionType = 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE' | 'CHANGE_STATUS' | 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'EXECUTE_QUERY';

// Helper function to create action type strings
function getActionType(baseType: string, action: ActionType, status?: ActionStatus): string {
    return status ? `${baseType}_${action}_${status}` : `${baseType}_${action}`;
}

// Generic action interfaces
interface BaseAction<T extends string> {
    type: T;
}

interface PayloadAction<T extends string, P> extends BaseAction<T> {
    payload: P;
}

// Create standard action creators
export function tableActionCreators<K extends string>(tableName: K) {
    const schema = getSchema(tableName);
    if (!schema) {
        throw new Error(`No schema found for table: ${tableName}`);
    }

    type TableData = InferFieldTypes<typeof schema> & { id: string };

    const baseType = schema.name.frontend.toUpperCase();

    // Define action types
    const actionTypes = {
        FETCH_REQUEST: getActionType(baseType, 'FETCH', 'REQUEST'),
        FETCH_SUCCESS: getActionType(baseType, 'FETCH', 'SUCCESS'),
        FETCH_FAILURE: getActionType(baseType, 'FETCH', 'FAILURE'),
        CREATE_REQUEST: getActionType(baseType, 'CREATE', 'REQUEST'),
        CREATE_SUCCESS: getActionType(baseType, 'CREATE', 'SUCCESS'),
        CREATE_FAILURE: getActionType(baseType, 'CREATE', 'FAILURE'),
        UPDATE_REQUEST: getActionType(baseType, 'UPDATE', 'REQUEST'),
        UPDATE_SUCCESS: getActionType(baseType, 'UPDATE', 'SUCCESS'),
        UPDATE_FAILURE: getActionType(baseType, 'UPDATE', 'FAILURE'),
        DELETE_REQUEST: getActionType(baseType, 'DELETE', 'REQUEST'),
        DELETE_SUCCESS: getActionType(baseType, 'DELETE', 'SUCCESS'),
        DELETE_FAILURE: getActionType(baseType, 'DELETE', 'FAILURE'),
        SUBSCRIBE: getActionType(baseType, 'SUBSCRIBE'),
        UNSUBSCRIBE: getActionType(baseType, 'UNSUBSCRIBE'),
        EXECUTE_QUERY_REQUEST: getActionType(baseType, 'EXECUTE_QUERY', 'REQUEST'),
        EXECUTE_QUERY_SUCCESS: getActionType(baseType, 'EXECUTE_QUERY', 'SUCCESS'),
        EXECUTE_QUERY_FAILURE: getActionType(baseType, 'EXECUTE_QUERY', 'FAILURE'),
    };

    // Action creators
    const actionCreators = {
        // Fetch Actions
        fetchRequest: (): BaseAction<typeof actionTypes.FETCH_REQUEST> => ({
            type: actionTypes.FETCH_REQUEST,
        }),
        fetchSuccess: (data: TableData[]): PayloadAction<typeof actionTypes.FETCH_SUCCESS, TableData[]> => ({
            type: actionTypes.FETCH_SUCCESS,
            payload: data,
        }),
        fetchFailure: (error: Error): PayloadAction<typeof actionTypes.FETCH_FAILURE, Error> => ({
            type: actionTypes.FETCH_FAILURE,
            payload: error,
        }),

        // Create Actions
        createRequest: (data: Partial<TableData>): PayloadAction<typeof actionTypes.CREATE_REQUEST, Partial<TableData>> => ({
            type: actionTypes.CREATE_REQUEST,
            payload: data,
        }),
        createSuccess: (data: TableData): PayloadAction<typeof actionTypes.CREATE_SUCCESS, TableData> => ({
            type: actionTypes.CREATE_SUCCESS,
            payload: data,
        }),
        createFailure: (error: Error): PayloadAction<typeof actionTypes.CREATE_FAILURE, Error> => ({
            type: actionTypes.CREATE_FAILURE,
            payload: error,
        }),

        // Update Actions
        updateRequest: (id: string, data: Partial<TableData>): PayloadAction<typeof actionTypes.UPDATE_REQUEST, { id: string; data: Partial<TableData> }> => ({
            type: actionTypes.UPDATE_REQUEST,
            payload: { id, data },
        }),
        updateSuccess: (data: TableData): PayloadAction<typeof actionTypes.UPDATE_SUCCESS, TableData> => ({
            type: actionTypes.UPDATE_SUCCESS,
            payload: data,
        }),
        updateFailure: (error: Error): PayloadAction<typeof actionTypes.UPDATE_FAILURE, Error> => ({
            type: actionTypes.UPDATE_FAILURE,
            payload: error,
        }),

        // Delete Actions
        deleteRequest: (id: string): PayloadAction<typeof actionTypes.DELETE_REQUEST, string> => ({
            type: actionTypes.DELETE_REQUEST,
            payload: id,
        }),
        deleteSuccess: (id: string): PayloadAction<typeof actionTypes.DELETE_SUCCESS, string> => ({
            type: actionTypes.DELETE_SUCCESS,
            payload: id,
        }),
        deleteFailure: (error: Error): PayloadAction<typeof actionTypes.DELETE_FAILURE, Error> => ({
            type: actionTypes.DELETE_FAILURE,
            payload: error,
        }),

        // Subscription Actions
        subscribe: (): BaseAction<typeof actionTypes.SUBSCRIBE> => ({
            type: actionTypes.SUBSCRIBE,
        }),
        unsubscribe: (): BaseAction<typeof actionTypes.UNSUBSCRIBE> => ({
            type: actionTypes.UNSUBSCRIBE,
        }),

        // Execute Query Actions
        executeCustomQueryRequest: (query: any): PayloadAction<typeof actionTypes.EXECUTE_QUERY_REQUEST, any> => ({
            type: actionTypes.EXECUTE_QUERY_REQUEST,
            payload: query,
        }),
        executeCustomQuerySuccess: (data: TableData[]): PayloadAction<typeof actionTypes.EXECUTE_QUERY_SUCCESS, TableData[]> => ({
            type: actionTypes.EXECUTE_QUERY_SUCCESS,
            payload: data,
        }),
        executeCustomQueryFailure: (error: Error): PayloadAction<typeof actionTypes.EXECUTE_QUERY_FAILURE, Error> => ({
            type: actionTypes.EXECUTE_QUERY_FAILURE,
            payload: error,
        }),
    };

    // Add custom actions based on schema properties
    const customActions = createCustomActions(schema, baseType);

    return { ...actionCreators, ...customActions };
}

function createCustomActions<T extends TableSchema>(
    schema: T,
    baseType: string
) {
    const customActions: Record<string, any> = {};

    if (schema.fields.status) {
        const actionTypes = {
            CHANGE_STATUS_REQUEST: getActionType(baseType, 'CHANGE_STATUS', 'REQUEST'),
            CHANGE_STATUS_SUCCESS: getActionType(baseType, 'CHANGE_STATUS', 'SUCCESS'),
            CHANGE_STATUS_FAILURE: getActionType(baseType, 'CHANGE_STATUS', 'FAILURE'),
        };

        type TableData = InferFieldTypes<T> & { id: string };

        customActions.changeStatusRequest = (id: string, status: string): PayloadAction<typeof actionTypes.CHANGE_STATUS_REQUEST, { id: string; status: string }> => ({
            type: actionTypes.CHANGE_STATUS_REQUEST,
            payload: { id, status },
        });

        customActions.changeStatusSuccess = (data: TableData): PayloadAction<typeof actionTypes.CHANGE_STATUS_SUCCESS, TableData> => ({
            type: actionTypes.CHANGE_STATUS_SUCCESS,
            payload: data,
        });

        customActions.changeStatusFailure = (error: Error): PayloadAction<typeof actionTypes.CHANGE_STATUS_FAILURE, Error> => ({
            type: actionTypes.CHANGE_STATUS_FAILURE,
            payload: error,
        });
    }

    // Additional custom actions based on schema fields can be added here

    return customActions;
}

// Export types for action creators
export type Actions<K extends string> = ReturnType<typeof tableActionCreators<K>>;
