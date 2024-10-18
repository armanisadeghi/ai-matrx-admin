import { call, put, takeEvery } from 'redux-saga/effects';
import { createActions, createActionTypes } from './dynamicActions';
import { databaseApi } from "@/utils/supabase/api-wrapper"; // Importing the updated API class

// Generic API handler function
function* apiSaga(action: any, apiFunction: any, successAction: any, failureAction: any) {
    try {
        const response = yield call(apiFunction, action.payload); // Assuming action.payload has the right structure
        yield put(successAction(response)); // Adjust response if necessary
    } catch (error) {
        yield put(failureAction(error));
    }
}

// Create a dynamic saga for a specific table
export const createSagaForTable = (tableName: string) => {
    const actionTypes = createActionTypes(tableName);
    const actions = createActions(actionTypes);

    // Saga for fetching all data
    function* fetchAllDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.fetchAll.bind(databaseApi, tableName), actions.fetchAllSuccess, actions.fetchAllFailure);
    }

    // Saga for fetching paginated data
    function* fetchPaginatedDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.fetchPaginated.bind(databaseApi, tableName), actions.fetchPaginatedSuccess, actions.fetchPaginatedFailure);
    }

    // Saga for creating data
    function* createDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.create.bind(databaseApi, tableName), actions.createSuccess, actions.createFailure);
    }

    // Saga for inserting simple data
    function* insertSimpleDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.insertSimple.bind(databaseApi, tableName), actions.insertSimpleSuccess, actions.insertSimpleFailure);
    }

    // Saga for inserting data with foreign key
    function* insertWithFkDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.insertWithFk.bind(databaseApi, tableName), actions.insertWithFkSuccess, actions.insertWithFkFailure);
    }

    // Saga for inserting data with inverse foreign key
    function* insertWithIfkDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.insertWithIfk.bind(databaseApi, tableName), actions.insertWithIfkSuccess, actions.insertWithIfkFailure);
    }

    // Saga for inserting data with both foreign key and inverse foreign key
    function* insertWithFkAndIfkDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.insertWithFkAndIfk.bind(databaseApi, tableName), actions.insertWithFkAndIfkSuccess, actions.insertWithFkAndIfkFailure);
    }

    // Saga for updating data
    function* updateDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.update.bind(databaseApi, tableName, action.payload.id), actions.updateSuccess, actions.updateFailure);
    }

    // Saga for deleting data
    function* deleteDataSaga(action: any) {
        yield* apiSaga(action, databaseApi.delete.bind(databaseApi, tableName, action.payload), actions.deleteSuccess, actions.deleteFailure);
    }

    // Saga for executing custom queries
    function* executeCustomQuerySaga(action: any) {
        yield* apiSaga(action, databaseApi.executeCustomQuery.bind(databaseApi, tableName), actions.executeCustomQuerySuccess, actions.executeCustomQueryFailure);
    }

    // Watcher Saga that listens to each action type and delegates to the appropriate worker saga
    function* watchTableSagas() {
        yield takeEvery(actionTypes.FETCH_ALL_REQUEST, fetchAllDataSaga);
        yield takeEvery(actionTypes.FETCH_PAGINATED_REQUEST, fetchPaginatedDataSaga);
        yield takeEvery(actionTypes.CREATE_REQUEST, createDataSaga);
        yield takeEvery(actionTypes.INSERT_SIMPLE_REQUEST, insertSimpleDataSaga);
        yield takeEvery(actionTypes.INSERT_WITH_FK_REQUEST, insertWithFkDataSaga);
        yield takeEvery(actionTypes.INSERT_WITH_IFK_REQUEST, insertWithIfkDataSaga);
        yield takeEvery(actionTypes.INSERT_WITH_FK_AND_IFK_REQUEST, insertWithFkAndIfkDataSaga);
        yield takeEvery(actionTypes.UPDATE_REQUEST, updateDataSaga);
        yield takeEvery(actionTypes.DELETE_REQUEST, deleteDataSaga);
        yield takeEvery(actionTypes.EXECUTE_QUERY_REQUEST, executeCustomQuerySaga);
    }

    return watchTableSagas;
};
