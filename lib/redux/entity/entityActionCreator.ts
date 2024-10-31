// lib/redux/entity/entityActionCreator.ts

import {QueryOptions} from "@/utils/supabase/api-wrapper";
import {EntityKeys} from "@/types/entityTypes";

type ActionStatus = 'REQUEST' | 'SUCCESS' | 'FAILURE';
type ActionType =
    | 'FETCH'
    | 'FETCH_ONE'
    | 'FETCH_PAGINATED'
    | 'FETCH_PAGINATED_DIRECTLY'
    | 'FETCH_BY_PRIMARY_KEY'
    | 'FETCH_RELATED'
    | 'FETCH_BY_FIELD'
    | 'FETCH_SIMPLE'
    | 'FETCH_ALL'
    | 'FETCH_PK_AND_DISPLAY_FIELDS'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'SUBSCRIBE'
    | 'UNSUBSCRIBE'
    | 'EXECUTE_QUERY'
    | 'CREATE_BACKUP'
    | 'RESTORE_BACKUP'
    | 'SET_SELECTED_ITEM';


function getActionType(baseType: string, action: ActionType, status?: ActionStatus): string {

    console.log("entityActionCreator getActionType",status ? `${baseType}_${action}_${status}` : `${baseType}_${action}`);

    return status ? `${baseType}_${action}_${status}` : `${baseType}_${action}`;
}

export function entityActionCreators(entityName: EntityKeys) {
    const baseType = `ENTITY/${entityName.toUpperCase()}`;

    return {
        FETCH_REQUEST: getActionType(baseType, 'FETCH', 'REQUEST'),
        FETCH_SUCCESS: getActionType(baseType, 'FETCH', 'SUCCESS'),
        FETCH_FAILURE: getActionType(baseType, 'FETCH', 'FAILURE'),

        FETCH_ONE_REQUEST: getActionType(baseType, 'FETCH_ONE', 'REQUEST'),
        FETCH_ONE_SUCCESS: getActionType(baseType, 'FETCH_ONE', 'SUCCESS'),
        FETCH_ONE_FAILURE: getActionType(baseType, 'FETCH_ONE', 'FAILURE'),

        FETCH_PAGINATED_REQUEST: getActionType(baseType, 'FETCH_PAGINATED', 'REQUEST'),
        FETCH_PAGINATED_SUCCESS: getActionType(baseType, 'FETCH_PAGINATED', 'SUCCESS'),
        FETCH_PAGINATED_FAILURE: getActionType(baseType, 'FETCH_PAGINATED', 'FAILURE'),

        FETCH_PAGINATED_DIRECTLY_REQUEST: getActionType(baseType, 'FETCH_PAGINATED_DIRECTLY', 'REQUEST'),
        FETCH_PAGINATED_DIRECTLY_SUCCESS: getActionType(baseType, 'FETCH_PAGINATED_DIRECTLY', 'SUCCESS'),
        FETCH_PAGINATED_DIRECTLY_FAILURE: getActionType(baseType, 'FETCH_PAGINATED_DIRECTLY', 'FAILURE'),

        FETCH_BY_PRIMARY_KEY_REQUEST: getActionType(baseType, 'FETCH_BY_PRIMARY_KEY', 'REQUEST'),
        FETCH_BY_PRIMARY_KEY_SUCCESS: getActionType(baseType, 'FETCH_BY_PRIMARY_KEY', 'SUCCESS'),
        FETCH_BY_PRIMARY_KEY_FAILURE: getActionType(baseType, 'FETCH_BY_PRIMARY_KEY', 'FAILURE'),

        FETCH_RELATED_REQUEST: getActionType(baseType, 'FETCH_RELATED', 'REQUEST'),
        FETCH_RELATED_SUCCESS: getActionType(baseType, 'FETCH_RELATED', 'SUCCESS'),
        FETCH_RELATED_FAILURE: getActionType(baseType, 'FETCH_RELATED', 'FAILURE'),

        FETCH_BY_FIELD_REQUEST: getActionType(baseType, 'FETCH_BY_FIELD', 'REQUEST'),
        FETCH_BY_FIELD_SUCCESS: getActionType(baseType, 'FETCH_BY_FIELD', 'SUCCESS'),
        FETCH_BY_FIELD_FAILURE: getActionType(baseType, 'FETCH_BY_FIELD', 'FAILURE'),

        FETCH_SIMPLE_REQUEST: getActionType(baseType, 'FETCH_SIMPLE', 'REQUEST'),
        FETCH_SIMPLE_SUCCESS: getActionType(baseType, 'FETCH_SIMPLE', 'SUCCESS'),
        FETCH_SIMPLE_FAILURE: getActionType(baseType, 'FETCH_SIMPLE', 'FAILURE'),

        FETCH_ALL_REQUEST: getActionType(baseType, 'FETCH_ALL', 'REQUEST'),
        FETCH_ALL_SUCCESS: getActionType(baseType, 'FETCH_ALL', 'SUCCESS'),
        FETCH_ALL_FAILURE: getActionType(baseType, 'FETCH_ALL', 'FAILURE'),

        FETCH_PK_AND_DISPLAY_FIELDS_REQUEST: getActionType(baseType, 'FETCH_PK_AND_DISPLAY_FIELDS', 'REQUEST'),
        FETCH_PK_AND_DISPLAY_FIELDS_SUCCESS: getActionType(baseType, 'FETCH_PK_AND_DISPLAY_FIELDS', 'SUCCESS'),
        FETCH_PK_AND_DISPLAY_FIELDS_FAILURE: getActionType(baseType, 'FETCH_PK_AND_DISPLAY_FIELDS', 'FAILURE'),

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

        CREATE_BACKUP_REQUEST: getActionType(baseType, 'CREATE_BACKUP', 'REQUEST'),
        CREATE_BACKUP_SUCCESS: getActionType(baseType, 'CREATE_BACKUP', 'SUCCESS'),
        CREATE_BACKUP_FAILURE: getActionType(baseType, 'CREATE_BACKUP', 'FAILURE'),

        RESTORE_BACKUP_REQUEST: getActionType(baseType, 'RESTORE_BACKUP', 'REQUEST'),
        RESTORE_BACKUP_SUCCESS: getActionType(baseType, 'RESTORE_BACKUP', 'SUCCESS'),
        RESTORE_BACKUP_FAILURE: getActionType(baseType, 'RESTORE_BACKUP', 'FAILURE'),

        SET_SELECTED_ITEM: getActionType(baseType, 'SET_SELECTED_ITEM'),

    };
}

export const createEntityActions = (entityName: EntityKeys) => {
    const actionTypes = entityActionCreators(entityName);

    return {
        fetchRequest: () => ({type: actionTypes.FETCH_REQUEST}),
        fetchSuccess: (data: any[]) => ({type: actionTypes.FETCH_SUCCESS, payload: data}),
        fetchFailure: (error: Error) => ({type: actionTypes.FETCH_FAILURE, payload: error}),

        fetchOneRequest: (id: string | number) => ({type: actionTypes.FETCH_ONE_REQUEST, payload: id}),
        fetchOneSuccess: (data: any) => ({type: actionTypes.FETCH_ONE_SUCCESS, payload: data}),
        fetchOneFailure: (error: Error) => ({type: actionTypes.FETCH_ONE_FAILURE, payload: error}),

        fetchPaginatedRequest: (page: number, pageSize: number, options?: QueryOptions<any>, maxCount?: number) => ({
            type: actionTypes.FETCH_PAGINATED_REQUEST,
            payload: {page, pageSize, options, maxCount}
        }),
        fetchPaginatedSuccess: (data: any[], total: number) => ({
            type: actionTypes.FETCH_PAGINATED_SUCCESS,
            payload: {data, total}
        }),
        fetchPaginatedFailure: (error: Error) => ({type: actionTypes.FETCH_PAGINATED_FAILURE, payload: error}),

        fetchPaginatedDirectlyRequest: (options: QueryOptions<any>) => ({
            type: actionTypes.FETCH_PAGINATED_REQUEST,
            payload: options
        }),
        fetchPaginatedDirectlySuccess: (data: any[], total: number) => ({
            type: actionTypes.FETCH_PAGINATED_SUCCESS,
            payload: {data, total}
        }),
        fetchPaginatedDirectlyFailure: (error: Error) => ({type: actionTypes.FETCH_PAGINATED_FAILURE, payload: error}),


        fetchByPrimaryKeyRequest: (primaryKey: string | number) => ({
            type: actionTypes.FETCH_BY_PRIMARY_KEY_REQUEST,
            payload: primaryKey
        }),
        fetchByPrimaryKeySuccess: (data: any) => ({type: actionTypes.FETCH_BY_PRIMARY_KEY_SUCCESS, payload: data}),
        fetchByPrimaryKeyFailure: (error: Error) => ({type: actionTypes.FETCH_BY_PRIMARY_KEY_FAILURE, payload: error}),

        fetchRelatedRequest: (relatedKey: string | number) => ({
            type: actionTypes.FETCH_RELATED_REQUEST,
            payload: relatedKey
        }),
        fetchRelatedSuccess: (data: any[]) => ({type: actionTypes.FETCH_RELATED_SUCCESS, payload: data}),
        fetchRelatedFailure: (error: Error) => ({type: actionTypes.FETCH_RELATED_FAILURE, payload: error}),

        fetchByFieldRequest: (field: string, value: any) => ({
            type: actionTypes.FETCH_BY_FIELD_REQUEST,
            payload: {field, value}
        }),
        fetchByFieldSuccess: (data: any[]) => ({type: actionTypes.FETCH_BY_FIELD_SUCCESS, payload: data}),
        fetchByFieldFailure: (error: Error) => ({type: actionTypes.FETCH_BY_FIELD_FAILURE, payload: error}),

        fetchSimpleRequest: () => ({type: actionTypes.FETCH_SIMPLE_REQUEST}),
        fetchSimpleSuccess: (data: any[]) => ({type: actionTypes.FETCH_SIMPLE_SUCCESS, payload: data}),
        fetchSimpleFailure: (error: Error) => ({type: actionTypes.FETCH_SIMPLE_FAILURE, payload: error}),

        fetchAllRequest: () => ({type: actionTypes.FETCH_ALL_REQUEST}),
        fetchAllSuccess: (data: any[]) => ({type: actionTypes.FETCH_ALL_SUCCESS, payload: data}),
        fetchAllFailure: (error: Error) => ({type: actionTypes.FETCH_ALL_FAILURE, payload: error}),

        fetchPkAndDisplayFieldsRequest: () => ({type: actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_REQUEST}),
        fetchPkAndDisplayFieldsSuccess: (data: any[]) => ({
            type: actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_SUCCESS,
            payload: data
        }),
        fetchPkAndDisplayFieldsFailure: (error: Error) => ({
            type: actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_FAILURE,
            payload: error
        }),

        createBackupRequest: () => ({type: actionTypes.CREATE_BACKUP_REQUEST}),
        createBackupSuccess: (data: any) => ({type: actionTypes.CREATE_BACKUP_SUCCESS, payload: data}),
        createBackupFailure: (error: Error) => ({type: actionTypes.CREATE_BACKUP_FAILURE, payload: error}),

        restoreBackupRequest: () => ({type: actionTypes.RESTORE_BACKUP_REQUEST}),
        restoreBackupSuccess: (data: any) => ({type: actionTypes.RESTORE_BACKUP_SUCCESS, payload: data}),
        restoreBackupFailure: (error: Error) => ({type: actionTypes.RESTORE_BACKUP_FAILURE, payload: error}),

        createRequest: (data: Partial<any>) => ({type: actionTypes.CREATE_REQUEST, payload: data}),
        createSuccess: (data: any) => ({type: actionTypes.CREATE_SUCCESS, payload: data}),
        createFailure: (error: Error) => ({type: actionTypes.CREATE_FAILURE, payload: error}),

        updateRequest: (id: string | number, data: Partial<any>) => ({
            type: actionTypes.UPDATE_REQUEST,
            payload: {id, data},
        }),
        updateSuccess: (data: any) => ({type: actionTypes.UPDATE_SUCCESS, payload: data}),
        updateFailure: (error: Error) => ({type: actionTypes.UPDATE_FAILURE, payload: error}),

        deleteRequest: (id: string | number) => ({type: actionTypes.DELETE_REQUEST, payload: id}),
        deleteSuccess: (id: string | number) => ({type: actionTypes.DELETE_SUCCESS, payload: id}),
        deleteFailure: (error: Error) => ({type: actionTypes.DELETE_FAILURE, payload: error}),

        subscribe: () => ({type: actionTypes.SUBSCRIBE}),
        unsubscribe: () => ({type: actionTypes.UNSUBSCRIBE}),

        executeQueryRequest: (query: any) => ({type: actionTypes.EXECUTE_QUERY_REQUEST, payload: query}),
        executeQuerySuccess: (data: any[]) => ({type: actionTypes.EXECUTE_QUERY_SUCCESS, payload: data}),
        executeQueryFailure: (error: Error) => ({type: actionTypes.EXECUTE_QUERY_FAILURE, payload: error}),

        setSelectedItem: (item: any) => ({
            type: actionTypes.SET_SELECTED_ITEM,
            payload: item,
        }),
    };
};
