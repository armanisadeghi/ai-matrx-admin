// lib/redux/store.ts

import {configureStore, ThunkAction, Action, combineReducers} from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { featureSchemas } from './dynamic/featureSchema';
import { createFeatureSlice } from './slices/featureSliceCreator';
import { getRegisteredSchemas, getSchema } from '@/utils/schema/schemaRegistry';
import { createModuleSlice } from './slices/moduleSliceCreator';
import { moduleSchemas, ModuleName } from './dynamic/moduleSchema';
import { schemaSliceCreator } from '@/lib/redux/slices/schemaSliceCreator';
import layoutReducer from './slices/layoutSlice';
import formReducer from './slices/formSlice';
import userReducer from './slices/userSlice';
import aiChatReducer from './slices/aiChatSlice';
import userPreferencesReducer from './slices/userPreferencesSlice';
import testRoutesReducer from './slices/testRoutesSlice';
import flashcardChatReducer from './slices/flashcardChatSlice';
import { themeReducer } from '@/styles/themes';
import rootSaga from "@/lib/redux/schemaSagas/rootSaga";

// Initialize saga middleware
const sagaMiddleware = createSagaMiddleware();

const featureReducers = Object.keys(featureSchemas).reduce((acc, featureName) => {
    const featureSchema = featureSchemas[featureName as keyof typeof featureSchemas];
    const featureSlice = createFeatureSlice(featureName as any, featureSchema);
    acc[featureName] = featureSlice.reducer;
    return acc;
}, {} as Record<string, any>);

const moduleReducers = Object.keys(moduleSchemas).reduce((acc, moduleName) => {
    const moduleSchema = moduleSchemas[moduleName as keyof typeof moduleSchemas];
    const moduleSlice = createModuleSlice(moduleName as ModuleName, moduleSchema);
    acc[moduleName] = moduleSlice.reducer;
    return acc;
}, {} as Record<string, any>);


// Get all registered schemas in the 'frontend' format
const registeredSchemaNames = getRegisteredSchemas('frontend');

// Create reducers for each registered schema
const schemaReducers = registeredSchemaNames.reduce((acc, tableName) => {
    const schema = getSchema(tableName, 'frontend');
    if (schema) {
        const reducer = schemaSliceCreator(tableName).reducer;
        acc[schema.name.frontend] = reducer;
    }
    return acc;
}, {} as Record<string, any>);


// Combine all reducers
const rootReducer = combineReducers({
    ...featureReducers,
    ...moduleReducers,
    ...schemaReducers, // Include the schema reducers
    layout: layoutReducer,
    theme: themeReducer,
    form: formReducer,
    user: userReducer,
    userPreferences: userPreferencesReducer,
    testRoutes: testRoutesReducer,
    flashcardChat: flashcardChatReducer,
    aiChat: aiChatReducer,
});

export const makeStore = (initialState?: ReturnType<typeof rootReducer>) => {
    return configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: false }).concat(sagaMiddleware),
        devTools: process.env.NODE_ENV !== 'production',
    });
    sagaMiddleware.run(rootSaga);
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
