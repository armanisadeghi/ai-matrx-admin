/*
import {PayloadAction} from "@reduxjs/toolkit";
import {call, put} from "redux-saga/effects";

export function* syncSaga(action: PayloadAction<SyncPayload>) {
    try {
        yield call(databaseService.batchSync, action.payload);
        yield put(syncSuccess());
    } catch (error) {
        yield put(syncError(error));
    }
}
*/
