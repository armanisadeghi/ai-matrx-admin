// lib/redux/middleware/entitySagaMiddleware.ts
import { Middleware } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { fork, takeEvery } from "redux-saga/effects";
import { getEntitySlice } from "./entitySlice";

// Create saga middleware
const entitySagaMiddlewareCreator = createSagaMiddleware();

// Saga handlers
function* handleMessageFetchSuccess(action: any) {
    console.log("handleMessageFetchSuccess side effect logic here", action);
    yield fork(messageFetchSuccessSaga, action.payload);
}

function* messageFetchSuccessSaga(payload: any) {
    console.log("messageFetchSuccessSaga side effect implementation", payload);
}

// Watch for specific entity actions
function* entityActionWatcher() {
    yield takeEvery((action: any) => action.type === `${getEntitySlice("message").actions.fetchRecordsSuccess}`, handleMessageFetchSuccess);
}

// Root saga
function* rootEntitySaga() {
    yield fork(entityActionWatcher);
}

// Configuration for which entities and actions to watch
const watchedEntities = new Set(["message"]);
const watchedActions = new Set(["fetchRecordsSuccess"]);

// Check if an action should bypass middleware (streaming or socketResponse actions)
const isStreamingAction = (type: string): boolean => {
    // Check if the action type starts with 'streaming/' or 'socketResponse/'
    return type.startsWith("streaming/") || type.startsWith("socketResponse/");
};

// Middleware implementation with streaming action bypass
export const entitySagaMiddleware: Middleware = (store) => (next) => (action: { type: string }) => {
    // IMPORTANT: First pass the action to the next middleware
    // This prevents circular dependencies in the middleware chain
    const result = next(action);

    if (isStreamingAction(action.type)) {
        return result;
    }

    const parts = action.type.split("/");
    if (parts.length !== 2) {
        return result;
    }

    const [sliceName, actionName] = parts;

    // Only process specific entity actions we care about
    if (watchedEntities.has(sliceName) && watchedActions.has(actionName)) {
        // Any additional processing can happen here
        // But we've already passed the action to the next middleware
        console.log(`Processing watched entity action: ${action.type}`);
    }

    return result;
};

// Initialize sagas
export const initializeEntitySagas = () => {
    entitySagaMiddlewareCreator.run(rootEntitySaga);
};

// Export the raw saga middleware for store configuration
export const rawSagaMiddleware = entitySagaMiddlewareCreator;
