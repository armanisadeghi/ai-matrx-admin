/*
import { takeEvery, call, put, select } from 'redux-saga/effects';

import { createEntitySlice  } from '../entity/slice';
import {loadDataForSchema, loadSchemaForContext} from "@/lib/redux/ui/uiThunks";
import {RootState} from "@/lib/redux/store";
import {EntityKeys} from "@/types/entityTypes"; // Import actions from data slice

function* handleLoadSchema(action: ReturnType<typeof loadSchemaForContext>) {
    try {
        const schema = yield call(fetchSchemaFromBackend, action.payload); // Fetch schema
        yield put(loadSchemaForContext.fulfilled(schema));
    } catch (error) {
        yield put(loadSchemaForContext.rejected(error));
    }
}

function* handleLoadData(action: ReturnType<typeof loadDataForSchema>) {
    const { entityKey, query } = action.payload;

    // Dynamically create the slice and get the actions
    const { actions } = createEntitySlice(entityKey, {} as any);




    try {
        const schema = yield select((state: RootState) => state.ui.currentSchema);
        const data = yield call(fetchDataFromBackend, schema.table); // Fetch data for schema table
        yield put(loadDataForSchema.fulfilled(data));
    } catch (error) {
        yield put(loadDataForSchema.rejected(error));
    }
}

function* handleFetchRecords(action: { payload: { entityKey: EntityKeys; query: any } }) {
    const { entityKey, query } = action.payload;

    // Dynamically create the slice and get the actions
    const { actions } = createEntitySlice(entityKey, {} as any);

    try {
        // Fetch data from API or backend
        const data = yield call(fetchRecords, query);

        // Dispatch the success action
        yield put(actions.fetchRecordsSuccess(data));
    } catch (error) {
        // Dispatch the error action
        yield put(actions.fetchRecordsRejected({ message: error.message }));
    }
}


function* uiSaga() {
    yield takeEvery(loadSchemaForContext.type, handleLoadSchema);
    yield takeEvery(loadDataForSchema.type, handleLoadData);
}
export default uiSaga;
*/
