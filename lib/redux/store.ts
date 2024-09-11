import createSagaMiddleware from 'redux-saga';
import {combineReducers, configureStore} from '@reduxjs/toolkit';
import { featureSchemas } from './featureSchema';
import { createFeatureSlice } from './sliceCreator';
import { createFeatureSagas } from './sagas';
import layoutReducer from './slices/layoutSlice';

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
});

export const makeStore = () => {
    const store = configureStore({
        reducer: rootReducer,
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(sagaMiddleware),
    });

    // sagaMiddleware.run(createFeatureSagas); // Run the new saga

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
