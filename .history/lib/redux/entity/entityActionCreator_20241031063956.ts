// lib/redux/entity/entityActionCreator.ts

import { createAction } from '@reduxjs/toolkit';
import { QueryOptions } from "@/utils/supabase/api-wrapper";
import { EntityKeys } from "@/types/entityTypes";

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
  return status ? `${baseType}_${action}_${status}` : `${baseType}_${action}`;
}

export function entityActionCreators(entityName: EntityKeys) {
  const baseType = `ENTITIES/${entityName.toUpperCase()}`;

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

export function createEntityActions(entityName: EntityKeys) {
  const actionTypes = entityActionCreators(entityName);

  return {
    fetchRequest: createAction(actionTypes.FETCH_REQUEST),
    fetchSuccess: createAction<any[]>(actionTypes.FETCH_SUCCESS),
    fetchFailure: createAction<Error>(actionTypes.FETCH_FAILURE),

    fetchOneRequest: createAction<string | number>(actionTypes.FETCH_ONE_REQUEST),
    fetchOneSuccess: createAction<any>(actionTypes.FETCH_ONE_SUCCESS),
    fetchOneFailure: createAction<Error>(actionTypes.FETCH_ONE_FAILURE),

    fetchPaginatedRequest: createAction<{
        page: number;
        pageSize: number;
        options?: QueryOptions<any>;
        maxCount?: number;
      }>(actionTypes.FETCH_PAGINATED_REQUEST),
      fetchPaginatedSuccess: createAction<{
      data: any[];
      totalCount: number;
      page: number;
      pageSize: number;
      maxCount?: number;
    }>(actionTypes.FETCH_PAGINATED_SUCCESS),
    fetchPaginatedFailure: createAction<Error>(actionTypes.FETCH_PAGINATED_FAILURE),

    fetchPaginatedDirectlyRequest: createAction<QueryOptions<any>>(actionTypes.FETCH_PAGINATED_DIRECTLY_REQUEST),
    fetchPaginatedDirectlySuccess: createAction<{
      data: any[];
      totalCount: number;
    }>(actionTypes.FETCH_PAGINATED_DIRECTLY_SUCCESS),
    fetchPaginatedDirectlyFailure: createAction<Error>(actionTypes.FETCH_PAGINATED_DIRECTLY_FAILURE),

    fetchByPrimaryKeyRequest: createAction<string | number>(actionTypes.FETCH_BY_PRIMARY_KEY_REQUEST),
    fetchByPrimaryKeySuccess: createAction<any>(actionTypes.FETCH_BY_PRIMARY_KEY_SUCCESS),
    fetchByPrimaryKeyFailure: createAction<Error>(actionTypes.FETCH_BY_PRIMARY_KEY_FAILURE),

    fetchRelatedRequest: createAction<string | number>(actionTypes.FETCH_RELATED_REQUEST),
    fetchRelatedSuccess: createAction<any[]>(actionTypes.FETCH_RELATED_SUCCESS),
    fetchRelatedFailure: createAction<Error>(actionTypes.FETCH_RELATED_FAILURE),

    fetchByFieldRequest: createAction<{
      field: string;
      value: any;
    }>(actionTypes.FETCH_BY_FIELD_REQUEST),
    fetchByFieldSuccess: createAction<any[]>(actionTypes.FETCH_BY_FIELD_SUCCESS),
    fetchByFieldFailure: createAction<Error>(actionTypes.FETCH_BY_FIELD_FAILURE),

    fetchSimpleRequest: createAction(actionTypes.FETCH_SIMPLE_REQUEST),
    fetchSimpleSuccess: createAction<any[]>(actionTypes.FETCH_SIMPLE_SUCCESS),
    fetchSimpleFailure: createAction<Error>(actionTypes.FETCH_SIMPLE_FAILURE),

    fetchAllRequest: createAction(actionTypes.FETCH_ALL_REQUEST),
    fetchAllSuccess: createAction<any[]>(actionTypes.FETCH_ALL_SUCCESS),
    fetchAllFailure: createAction<Error>(actionTypes.FETCH_ALL_FAILURE),

    fetchPkAndDisplayFieldsRequest: createAction(actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_REQUEST),
    fetchPkAndDisplayFieldsSuccess: createAction<any[]>(actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_SUCCESS),
    fetchPkAndDisplayFieldsFailure: createAction<Error>(actionTypes.FETCH_PK_AND_DISPLAY_FIELDS_FAILURE),

    createBackupRequest: createAction(actionTypes.CREATE_BACKUP_REQUEST),
    createBackupSuccess: createAction<any>(actionTypes.CREATE_BACKUP_SUCCESS),
    createBackupFailure: createAction<Error>(actionTypes.CREATE_BACKUP_FAILURE),

    restoreBackupRequest: createAction(actionTypes.RESTORE_BACKUP_REQUEST),
    restoreBackupSuccess: createAction<any>(actionTypes.RESTORE_BACKUP_SUCCESS),
    restoreBackupFailure: createAction<Error>(actionTypes.RESTORE_BACKUP_FAILURE),

    createRequest: createAction<Partial<any>>(actionTypes.CREATE_REQUEST),
    createSuccess: createAction<any>(actionTypes.CREATE_SUCCESS),
    createFailure: createAction<Error>(actionTypes.CREATE_FAILURE),

    updateRequest: createAction<{
      id: string | number;
      data: Partial<any>;
    }>(actionTypes.UPDATE_REQUEST),
    updateSuccess: createAction<any>(actionTypes.UPDATE_SUCCESS),
    updateFailure: createAction<Error>(actionTypes.UPDATE_FAILURE),

    deleteRequest: createAction<string | number>(actionTypes.DELETE_REQUEST),
    deleteSuccess: createAction<string | number>(actionTypes.DELETE_SUCCESS),
    deleteFailure: createAction<Error>(actionTypes.DELETE_FAILURE),

    subscribe: createAction(actionTypes.SUBSCRIBE),
    unsubscribe: createAction(actionTypes.UNSUBSCRIBE),

    executeQueryRequest: createAction<any>(actionTypes.EXECUTE_QUERY_REQUEST),
    executeQuerySuccess: createAction<any[]>(actionTypes.EXECUTE_QUERY_SUCCESS),
    executeQueryFailure: createAction<Error>(actionTypes.EXECUTE_QUERY_FAILURE),

    setSelectedItem: createAction<any>(actionTypes.SET_SELECTED_ITEM),
  };
}
