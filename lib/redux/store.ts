// lib/redux/store.ts

import {configureStore, ThunkAction, Action} from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import {moduleSchemas, ModuleName} from './dynamic/moduleSchema';
import {TableNames, AutomationTableStructure} from '@/types/automationTableTypes';
import {createRootSaga} from "@/lib/redux/sagas/rootSaga";
import {loggerMiddleware} from '@/lib/logger/redux-middleware';
import {createRootReducer} from "@/lib/redux/rootReducer";


const sagaMiddleware = createSagaMiddleware();


export const makeStore = (initialState?: any) => {
    if (!initialState?.schema?.schema) {
        throw new Error('Schema must be provided to create store');
    }

    const rootReducer = createRootReducer(initialState.schema.schema);

    const store = configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    ignoredPaths: ['schema.schema']
                }
            }).concat(sagaMiddleware, loggerMiddleware),
        devTools: process.env.NODE_ENV !== 'production',
    });

    if (initialState.schema.schema) {
        const rootSagaInstance = createRootSaga(initialState.schema.schema);
        sagaMiddleware.run(rootSagaInstance);
    } else {
        throw new Error('Schema must be provided to create store');
    }

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;
