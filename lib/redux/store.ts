import { configureStore, ThunkAction, Action, combineReducers } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { featureSchemas } from './dynamic/featureSchema';
import { createFeatureSlice } from './slices/featureSliceCreator';
import { createModuleSlice } from './slices/moduleSliceCreator';
import { moduleSchemas, ModuleName } from './dynamic/moduleSchema';
import layoutReducer from './slices/layoutSlice';
import formReducer from './slices/formSlice';
import userReducer from './slices/userSlice';
import aiChatReducer from './slices/aiChatSlice';
import userPreferencesReducer from './slices/userPreferencesSlice';
import testRoutesReducer from './slices/testRoutesSlice';
import flashcardChatReducer from './slices/flashcardChatSlice';
import { themeReducer } from '@/styles/themes';
import { rootSaga } from "@/lib/redux/rootSaga";
import {tableSchemas, viewSchemas} from "@/utils/schema/initialSchemas";
import {initializeTableSchema} from "@/lib/redux/concepts/automation-concept/baseAutomationConcept";
import {TableSchema, ViewSchema} from '@/types/AutomationTypes';

const sagaMiddleware = createSagaMiddleware();

// Stronger typing for featureReducers and moduleReducers
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

const initializedTableSchemas = Object.keys(tableSchemas).reduce((acc, tableName) => {
    const tableSchema = tableSchemas[tableName as keyof typeof tableSchemas];
    acc[tableName] = initializeTableSchema(tableSchema as TableSchema);
    return acc;
}, {} as Record<string, TableSchema>);

// Initialize all view schemas similarly
const initializedViewSchemas = Object.keys(viewSchemas).reduce((acc, viewName) => {
    const viewSchema = viewSchemas[viewName as keyof typeof viewSchemas];
    acc[viewName] = initializeViewSchema(viewSchema as ViewSchema); // Create this similar to initializeTableSchema
    return acc;
}, {} as Record<string, ViewSchema>);


const rootReducer = combineReducers({
    ...featureReducers,
    ...moduleReducers,
    ...initializedTableSchemas,
    ...initializedViewSchemas,
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
    const store = configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
        devTools: process.env.NODE_ENV !== 'production',
    });

    sagaMiddleware.run(rootSaga);

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;
