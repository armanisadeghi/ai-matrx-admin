// lib/redux/store.ts

import createSagaMiddleware from 'redux-saga';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { featureSchemas } from './featureSchema';
import { createFeatureSlice } from './sliceCreator';
import { createFeatureSagas } from './sagas';
import layoutReducer from './slices/layoutSlice';
import formReducer from './slices/formSlice';
import userReducer from './slices/userSlice';
import { themeReducer } from "@/styles/themes";

const sagaMiddleware = createSagaMiddleware();

const featureReducers = Object.keys(featureSchemas).reduce((acc, featureName) => {
    const featureSchema = featureSchemas[featureName as keyof typeof featureSchemas];
    const featureSlice = createFeatureSlice(featureName as any, featureSchema);
    acc[featureName] = featureSlice.reducer;
    return acc;
}, {} as Record<string, any>);

const rootReducer = combineReducers({
    ...featureReducers,
    layout: layoutReducer,
    theme: themeReducer,
    form: formReducer,
    user: userReducer, // Add this line
});

export const makeStore = (initialState?: any) => {
    return configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(sagaMiddleware),
        devTools: process.env.NODE_ENV !== 'production',
    });

    // sagaMiddleware.run(createFeatureSagas); Soon to be implemented

};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

