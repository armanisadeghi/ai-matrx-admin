import { databaseApi } from '@/utils/supabase/api-wrapper';
import { call, put, takeLatest } from 'redux-saga/effects';

// Action types
export const FETCH_ONE = 'FETCH_ONE';
export const FETCH_ALL = 'FETCH_ALL';
export const FETCH_PAGINATED = 'FETCH_PAGINATED';
export const CREATE = 'CREATE';
export const UPDATE = 'UPDATE';
export const DELETE = 'DELETE';
export const EXECUTE_QUERY = 'EXECUTE_QUERY';

// Action creators
export const fetchOne = (name, id, options) => ({ type: FETCH_ONE, payload: { name, id, options } });
export const fetchAll = (name, options) => ({ type: FETCH_ALL, payload: { name, options } });
export const fetchPaginated = (name, options) => ({ type: FETCH_PAGINATED, payload: { name, options } });
export const create = (name, data) => ({ type: CREATE, payload: { name, data } });
export const update = (name, id, data) => ({ type: UPDATE, payload: { name, id, data } });
export const deleteItem = (name, id) => ({ type: DELETE, payload: { name, id } });
export const executeQuery = (name, query) => ({ type: EXECUTE_QUERY, payload: { name, query } });

// Sagas
function* fetchOneSaga(action) {
    try {
        const { name, id, options } = action.payload;
        const result = yield call(databaseApi.fetchOne.bind(databaseApi), name, id, options);
        yield put({ type: `${FETCH_ONE}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${FETCH_ONE}_FAILURE`, error: error.message });
    }
}

function* fetchAllSaga(action) {
    try {
        const { name, options } = action.payload;
        const result = yield call(databaseApi.fetchAll.bind(databaseApi), name, options);
        yield put({ type: `${FETCH_ALL}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${FETCH_ALL}_FAILURE`, error: error.message });
    }
}

function* fetchPaginatedSaga(action) {
    try {
        const { name, options } = action.payload;
        const result = yield call(databaseApi.fetchPaginated.bind(databaseApi), name, options);
        yield put({ type: `${FETCH_PAGINATED}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${FETCH_PAGINATED}_FAILURE`, error: error.message });
    }
}

function* createSaga(action) {
    try {
        const { name, data } = action.payload;
        const result = yield call(databaseApi.create.bind(databaseApi), name, data);
        yield put({ type: `${CREATE}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${CREATE}_FAILURE`, error: error.message });
    }
}

function* updateSaga(action) {
    try {
        const { name, id, data } = action.payload;
        const result = yield call(databaseApi.update.bind(databaseApi), name, id, data);
        yield put({ type: `${UPDATE}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${UPDATE}_FAILURE`, error: error.message });
    }
}

function* deleteSaga(action) {
    try {
        const { name, id } = action.payload;
        yield call(databaseApi.delete.bind(databaseApi), name, id);
        yield put({ type: `${DELETE}_SUCCESS`, payload: { name, id } });
    } catch (error) {
        yield put({ type: `${DELETE}_FAILURE`, error: error.message });
    }
}

function* executeQuerySaga(action) {
    try {
        const { name, query } = action.payload;
        const result = yield call(databaseApi.executeQuery.bind(databaseApi), name, query);
        yield put({ type: `${EXECUTE_QUERY}_SUCCESS`, payload: result });
    } catch (error) {
        yield put({ type: `${EXECUTE_QUERY}_FAILURE`, error: error.message });
    }
}

// Root saga
export function* databaseSaga() {
    yield takeLatest(FETCH_ONE, fetchOneSaga);
    yield takeLatest(FETCH_ALL, fetchAllSaga);
    yield takeLatest(FETCH_PAGINATED, fetchPaginatedSaga);
    yield takeLatest(CREATE, createSaga);
    yield takeLatest(UPDATE, updateSaga);
    yield takeLatest(DELETE, deleteSaga);
    yield takeLatest(EXECUTE_QUERY, executeQuerySaga);
}
