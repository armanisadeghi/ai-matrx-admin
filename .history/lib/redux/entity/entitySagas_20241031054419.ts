import { call, put, takeLatest, all, select } from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";
import { QueryOptions } from "@/utils/supabase/api-wrapper";
import { createEntitySlice } from "@/lib/redux/entity/entitySliceCreator";
import {
  AutomationEntities,
  EntityKeys,
  EntityData,
} from "@/types/entityTypes";
import { supabase } from "@/utils/supabase/client";
import {
  selectDatabaseConversion,
  selectEntityDatabaseName,
  selectFrontendConversion,
} from "@/lib/redux/schema/old/schemaSelectors";

function* initializeDatabaseApi(tableName: string) {
  return supabase.from(tableName);
}

function* withConversion<TEntity extends EntityKeys>(
  sagaHandler: (
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
    api: any,
    action: PayloadAction<any>,
    tableName: string,
    dbQueryOptions: any
  ) => any,
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
  action: PayloadAction<any>
) {
  try {
    console.log("withConversion has entityKey:", entityKey);
    const tableName: string = yield select(selectEntityDatabaseName, entityKey);
    console.log("withConversion converted tableName:", tableName);

    const api = yield call(initializeDatabaseApi, tableName);

    const dbQueryOptions = yield select(
      selectDatabaseConversion,
      action.payload
    );

    yield call(
      sagaHandler,
      entityKey,
      actions,
      api,
      action,
      tableName,
      dbQueryOptions
    );
  } catch (error: any) {
    yield put(actions.setError(error.message || "An error occurred."));
  }
}

/**
 * Utility function to get primary key value from a record
 */

/*
function* getPrimaryKeyInfo<TEntity extends EntityKeys>(
    databaseApi: DatabaseApiWrapper<TEntity>,
    record: EntityRecord<TEntity, 'frontend'>
): Generator<any, { field: string; value: string | number }> {
    const primaryKeyField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);
    const value = record[primaryKeyField];
    return {field: primaryKeyField, value};
}
*/

function* handleFetchByField<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    field: keyof EntityRecord<TEntity, "frontend">;
    value: string | number;
    options?: QueryOptions<TEntity>;
  }>
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    yield put(actions.setLoading(true));

    const data: EntityRecord<TEntity, "frontend">[] = yield call(
      [databaseApi, databaseApi.fetchByField],
      action.payload.field,
      action.payload.value,
      action.payload.options
    );

    if (data) {
      yield put(actions.setTableData(data));
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

function* handleFetchPkAndDisplayFields<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"]
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const pkField = yield call([databaseApi, databaseApi.getPrimaryKeyField]);
    const displayField = yield call([databaseApi, databaseApi.getDisplayField]);

    const data: EntityRecord<TEntity, "frontend">[] = yield call(
      [databaseApi, databaseApi.fetchAll],
      {
        columns: [pkField, ...(displayField ? [displayField] : [])],
      }
    );

    const pkAndDisplayFields = data.map((record) => ({
      pk: record[pkField],
      display: displayField ? record[displayField] : undefined,
    }));

    yield put(actions.setAllPkAndDisplayFields(pkAndDisplayFields));
  } catch (error: any) {
    yield put(actions.setError(error.message));
  }
}

function* handleCreateBackup<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{ key: string }>
) {
  try {
    const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
      (state) => state[entityKey].data
    );

    yield put(
      actions.setBackup({
        key: action.payload.key,
        data: currentData,
      })
    );
  } catch (error: any) {
    yield put(actions.setError(error.message));
  }
}

function* handleRestoreBackup<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{ key: string }>
) {
  try {
    const backups: Record<string, EntityRecord<TEntity, "frontend">[]> =
      yield select((state) => state[entityKey].backups);

    const backupData = backups[action.payload.key];
    if (backupData) {
      yield put(actions.setTableData(backupData));
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  }
}

function* handleFetchSimple<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    id: string | number;
    options?: QueryOptions<TEntity>;
  }>
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi, entityKey);

    yield put(actions.setLoading(true));

    const data: EntityRecord<TEntity, "frontend"> = yield call(
      [databaseApi, databaseApi.fetchSimple],
      action.payload.id,
      action.payload.options
    );

    if (data) {
      yield put(actions.setSelectedItem(data));
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

function* handleSubscribeToChanges<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    callback: (data: EntityRecord<TEntity, "frontend">[]) => void;
  }>
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    yield call(
      [databaseApi, databaseApi.subscribeToChanges],
      action.payload.callback
    );
  } catch (error: any) {
    yield put(actions.setError(error.message));
  }
}

function* handleUnsubscribeFromChanges<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"]
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    yield call([databaseApi, databaseApi.unsubscribeFromChanges]);
  } catch (error: any) {
    yield put(actions.setError(error.message));
  }
}

/**
 * Handle paginated query for an entity
 */
function* MakeQuery<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    options?: QueryOptions<TEntity>;
    page?: number;
    pageSize?: number;
  }>
) {
  try {
    const state = yield select();
    const entityState = state[entityKey];
    const optionsKey = JSON.stringify(action.payload || {});
    const lastFetchedTime = entityState.lastFetched[optionsKey];
    const now = Date.now();
    const isStale =
      !lastFetchedTime || now - lastFetchedTime > entityState.staleTime;

    if (!isStale) return;

    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    yield put(actions.setLoading(true));

    const result: {
      data: EntityRecord<TEntity, "frontend">[];
      page: number;
      pageSize: number;
      totalCount: number;
    } = yield call(
      [databaseApi, databaseApi.fetchPaginated],
      action.payload.options,
      action.payload.page,
      action.payload.pageSize
    );

    yield put(
      actions.setPaginatedData({
        data: result.data,
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
      })
    );
    yield put(actions.setLastFetched({ key: optionsKey, time: now }));
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

/**
 * Updated handlers using dynamic primary key
 */
function* handleFetchOne<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    primaryKeyValue: string | number;
    options?: QueryOptions<TEntity>;
  }>
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const state = yield select();
    const entityState = state[entityKey];
    const primaryKeyField = yield call([
      databaseApi,
      databaseApi.getPrimaryKeyField,
    ]);

    const item = entityState.data.find(
      (item: EntityRecord<TEntity, "frontend">) =>
        item[primaryKeyField] === action.payload.primaryKeyValue
    );

    const lastFetchedTime =
      entityState.lastFetched[action.payload.primaryKeyValue];
    const now = Date.now();
    const isStale =
      !lastFetchedTime || now - lastFetchedTime > entityState.staleTime;

    if (item && !isStale) {
      yield put(actions.setSelectedItem(item));
      return;
    }

    yield put(actions.setLoading(true));

    const data: EntityRecord<TEntity, "frontend"> = yield call(
      [databaseApi, databaseApi.fetchByPrimaryKey],
      action.payload.primaryKeyValue,
      action.payload.options
    );

    if (data) {
      yield put(actions.setSelectedItem(data));
      yield put(
        actions.setLastFetched({
          key: action.payload.primaryKeyValue.toString(),
          time: now,
        })
      );
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

/**
 * Handle creating a new record
 */
function* handleCreate<TEntity extends EntityKeys>(
    entityKey: TEntity,
    actions: ReturnType<typeof createEntitySlice<TEntity>>['actions'],
    api: any,
    action: PayloadAction<Partial<EntityData<TEntity>>>,
    tableName: string,
    dbQueryOptions: any
  ) {
    try {
      console.log('handleCreate starting with:', entityKey, action.payload);

      const { data, error } = yield api.insert(action.payload).single();

      if (error) {
        throw error;
      }

      const frontendResponse = yield select(selectFrontendConversion, data);

      // Dispatch success action
      yield put(actions.createSuccess(frontendResponse));
    } catch (error: any) {
      // Dispatch failure action
      yield put(actions.createFailure(error));
    }
  }

/**
 * Handle updating a record
 */
function* handleUpdate<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    id: string | number;
    data: Partial<EntityRecord<TEntity, "frontend">>;
  }>
) {
  try {
    yield put(actions.setLoading(true));

    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const updatedData: EntityRecord<TEntity, "frontend"> | null = yield call(
      [databaseApi, databaseApi.update],
      action.payload.id,
      action.payload.data
    );

    if (updatedData) {
      const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
        (state) => state[entityKey].data
      );

      // const newData = currentData.map(item =>
      //     item.id === action.payload.id ? updatedData : item
      // );
      //
      // yield put(actions.setTableData(newData));
      yield put(
        actions.setLastFetched({
          key: action.payload.id.toString(),
          time: Date.now(),
        })
      );
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

/**
 * Handle deleting a record
 */
function* handleDelete<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<string | number>
) {
  try {
    yield put(actions.setLoading(true));

    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const success: boolean = yield call(
      [databaseApi, databaseApi.delete],
      action.payload
    );

    if (success) {
      const currentData: EntityRecord<TEntity, "frontend">[] = yield select(
        (state) => state[entityKey].data
      );

      // const filteredData = currentData.filter(
      //     item => item.id !== action.payload
      // );
      //
      // yield put(actions.setTableData(filteredData));
      // yield put(actions.removeLastFetchedKey(action.payload.toString()));
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

/**
 * Handle custom query execution
 */
function* handleExecuteCustomQuery<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    queryFn: (baseQuery: PostgrestFilterBuilder<any, any, any>) => Promise<any>;
    format?: "frontend" | "database";
  }>
) {
  try {
    yield put(actions.setLoading(true));

    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const rawData: unknown[] = yield call(
      [databaseApi, databaseApi.executeCustomQuery],
      action.payload.queryFn
    );

    const formattedData =
      action.payload.format === "database"
        ? rawData
        : rawData.map((item) =>
            createFormattedRecord(
              entityKey,
              item as Record<string, unknown>,
              "frontend"
            )
          );

    yield put(actions.setTableData(formattedData));
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

function* handleFetchAll<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    options?: QueryOptions<TEntity>;
  }>
) {
  try {
    yield put(actions.setLoading(true));

    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    const data: EntityRecord<TEntity, "frontend">[] = yield call(
      [databaseApi, databaseApi.fetchAll],
      action.payload.options
    );

    if (data) {
      yield put(actions.setTableData(data));
      yield put(
        actions.setLastFetched({
          key: "all",
          time: Date.now(),
        })
      );
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

function* handleFetchByPrimaryKey<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice>["actions"],
  action: PayloadAction<{
    primaryKeyValue: string | number;
    options?: QueryOptions<TEntity>;
  }>
) {
  try {
    const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey);

    yield put(actions.setLoading(true));

    const data: EntityRecord<TEntity, "frontend"> = yield call(
      [databaseApi, databaseApi.fetchByPrimaryKey],
      action.payload.primaryKeyValue,
      action.payload.options
    );

    if (data) {
      yield put(actions.setSelectedItem(data));
    }
  } catch (error: any) {
    yield put(actions.setError(error.message));
  } finally {
    yield put(actions.setLoading(false));
  }
}

// function* handleFetchPaginated<TEntity extends EntityKeys>(
//     entityKey: TEntity,
//     actions: ReturnType<typeof createEntitySlice>['actions'],
//     action: PayloadAction<{
//         options?: QueryOptions<TEntity>;
//         page: number;
//         pageSize: number;
//         maxCount?: number;
//     }>
// ) {
//     try {
//         yield put(actions.setLoading(true));
//
//         const databaseApi = yield call(initializeDatabaseApi<TEntity>, entityKey,);
//
//         const {
//             page,
//             pageSize,
//             maxCount = 10000,
//             options = {}
//         } = action.payload;
//
//         const result: {
//             page: number;
//             pageSize: number;
//             totalCount: number;
//             maxCount: number;
//             data: EntityRecord<TEntity, 'frontend'>[];
//         } = yield call(
//             [databaseApi, databaseApi.fetchPaginatedDirectly],
//             options,
//             page,
//             pageSize,
//             maxCount
//         );
//
//         if (result && result.data) {
//             yield put(actions.setPaginatedData({
//                 data: result.data,
//                 page: result.page,
//                 pageSize: result.pageSize,
//                 totalCount: result.totalCount,
//                 maxCount: result.maxCount
//             }));
//         }
//     } catch (error: any) {
//         yield put(actions.setError(error.message));
//     } finally {
//         yield put(actions.setLoading(false));
//     }
// }

function* handleFetchPaginated<TEntity extends EntityKeys>(
  entityKey: TEntity,
  actions: ReturnType<typeof createEntitySlice<TEntity>>["actions"],
  api: any,
  action: PayloadAction<{
    options?: QueryOptions<TEntity>;
    page: number;
    pageSize: number;
    maxCount?: number;
  }>,
  tableName: string,
  dbQueryOptions: any
) {
  try {
    console.log(
      "handleFetchPaginated starting with:",
      entityKey,
      action.payload
    );

    // Fetch data from the API
    const from = (action.payload.page - 1) * action.payload.pageSize;
    const to = action.payload.page * action.payload.pageSize - 1;

    const { data, error, count } = yield api
      .select("*", { count: "exact" })
      .range(from, to);

    if (error) {
      throw error;
    }

    const frontendResponse = yield select(selectFrontendConversion, data);

    const result = {
      data: frontendResponse,
      page: action.payload.page,
      pageSize: action.payload.pageSize,
      totalCount: count,
      maxCount: action.payload.maxCount || 10000,
    };

    // Dispatch success action
    yield put(actions.fetchPaginatedSuccess(result));
  } catch (error: any) {
    // Dispatch failure action
    yield put(actions.fetchPaginatedFailure(error));
  }
}

type EntitySchemaType<TEntity extends EntityKeys> = AutomationEntities[TEntity];

export function createEntitySaga<TEntity extends EntityKeys>(
  entityKey: TEntity
) {
  const actions = createEntityActions(entityKey);
  const baseType = `ENTITIES/${entityKey.toUpperCase()}`;
  // console.log('- createEntitySaga baseType', baseType);

  return function* saga() {
    yield all([
      takeLatest(
        `${baseType}_FETCH_REQUEST`,
        withConversion.bind(null, MakeQuery, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_PAGINATED_REQUEST`,
        withConversion.bind(null, handleFetchPaginated, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_ONE_REQUEST`,
        withConversion.bind(null, handleFetchOne, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_CREATE_REQUEST`,
        withConversion.bind(null, handleCreate, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_UPDATE_REQUEST`,
        withConversion.bind(null, handleUpdate, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_DELETE_REQUEST`,
        withConversion.bind(null, handleDelete, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_EXECUTE_QUERY_REQUEST`,
        withConversion.bind(null, handleExecuteCustomQuery, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_PAGINATED_REQUEST`,
        withConversion.bind(null, MakeQuery, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_BY_PRIMARY_KEY_REQUEST`,
        withConversion.bind(null, handleFetchByPrimaryKey, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_BY_FIELD_REQUEST`,
        withConversion.bind(null, handleFetchByField, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_SIMPLE_REQUEST`,
        withConversion.bind(null, handleFetchSimple, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_SUBSCRIBE`,
        withConversion.bind(null, handleSubscribeToChanges, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_UNSUBSCRIBE`,
        withConversion.bind(
          null,
          handleUnsubscribeFromChanges,
          entityKey,
          actions
        )
      ),
      takeLatest(
        `${baseType}_FETCH_ALL_REQUEST`,
        withConversion.bind(null, handleFetchAll, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_FETCH_PK_AND_DISPLAY_FIELDS_REQUEST`,
        withConversion.bind(
          null,
          handleFetchPkAndDisplayFields,
          entityKey,
          actions
        )
      ),
      takeLatest(
        `${baseType}_CREATE_BACKUP_REQUEST`,
        withConversion.bind(null, handleCreateBackup, entityKey, actions)
      ),
      takeLatest(
        `${baseType}_RESTORE_BACKUP_REQUEST`,
        withConversion.bind(null, handleRestoreBackup, entityKey, actions)
      ),
    ]);
  };
}

/**
 * Initialize DatabaseApiWrapper for a given entity and dynamically inject the Supabase client
 */
// function* initializeDatabaseApi<TEntity extends EntityKeys>(
//     entityKey: TEntity
// ) {
//     const schemaResolution = yield call(useSchemaResolution);
//     const databaseApi = DatabaseApiWrapper.create(entityKey, schemaResolution);
//     databaseApi.setClient(supabase);
//     return databaseApi;
// }