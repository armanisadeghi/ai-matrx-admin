// File: lib/redux/store.ts
"use client";

import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { createRootSaga } from "@/lib/redux/sagas/rootSaga";
import { createRootReducer } from "@/lib/redux/rootReducer";
import { loggerMiddleware } from "@/utils/logger";
import { storageMiddleware } from "./storage/storageMiddleware";
import { enableMapSet } from "immer";
import { entitySagaMiddleware } from "./entity/entitySagaMiddleware";
import { Socket } from "socket.io-client";
import { socketMiddleware } from "./socket-io/connection/socketMiddleware";

const sagaMiddleware = createSagaMiddleware();

export const makeStore = (initialState: any) => {
    if (!initialState?.globalCache?.schema) {
        throw new Error("Schema must be provided to create store");
    }

    const rootReducer = createRootReducer(initialState);

    const store = configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
                immutableCheck: false,
                actionCreatorCheck: false,
            }).concat(sagaMiddleware, loggerMiddleware, socketMiddleware, storageMiddleware, entitySagaMiddleware),
        devTools: process.env.NODE_ENV !== "production",
    });

    const rootSagaInstance = createRootSaga(initialState.globalCache.entityNames);
    sagaMiddleware.run(rootSagaInstance);

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;

enableMapSet();
