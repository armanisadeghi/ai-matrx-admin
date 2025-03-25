// lib/redux/middleware/entitySagaMiddleware.ts
import { Middleware } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { fork, takeEvery } from "redux-saga/effects";
import { getEntitySlice } from "./entitySlice";

const entitySagaMiddlewareCreator = createSagaMiddleware();

function* handleMessageFetchSuccess(action: any) {
    console.log("handleMessageFetchSuccess side effect logic here", action);
  yield fork(messageFetchSuccessSaga, action.payload);
}

function* messageFetchSuccessSaga(payload: any) {
  console.log("messageFetchSuccessSaga side effect implementation", payload);
}

function* entityActionWatcher() {
  yield takeEvery(
    (action: any) => 
      action.type === `${getEntitySlice("message").actions.fetchRecordsSuccess}`,
    handleMessageFetchSuccess
  );
}

function* rootEntitySaga() {
  yield fork(entityActionWatcher);
}

const watchedEntities = new Set<string>(["message"]);
const watchedActions = new Set<string>(["fetchRecordsSuccess"]);

export const entitySagaMiddleware: Middleware = (store) => (next) => (action: { type: string }) => {
  const [sliceName, actionName] = action.type.split("/");

  if (!watchedEntities.has(sliceName) || !watchedActions.has(actionName)) {
    return next(action);
  }

  const result = next(action);
  return result;
};

export const initializeEntitySagas = () => {
  entitySagaMiddlewareCreator.run(rootEntitySaga);
};

