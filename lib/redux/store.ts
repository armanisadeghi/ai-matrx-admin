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
import {automationTableSchema} from "@/utils/schema/initialSchemas";
import {TableSchema, TableSchemaStructure} from "@/types/AutomationTypes";
import {initializeTableSchema} from "@/utils/schema/precomputeUtil";
import {AutomationTableName} from "@/types/AutomationSchemaTypes";

const sagaMiddleware = createSagaMiddleware();

type AutomationTableReducers = {
    [K in AutomationTableName]: TableSchema<K>;
};

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

const automationTableReducers = Object.entries(automationTableSchema).reduce<AutomationTableReducers>((acc, [tableName, tableSchema]) => {
    acc[tableName as AutomationTableName] = initializeTableSchema(
        tableSchema as TableSchema<AutomationTableName>
    );
    return acc;
}, {} as AutomationTableReducers);


const rootReducer = combineReducers({
    ...featureReducers,
    ...moduleReducers,
    ...automationTableReducers,
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





/*
    ...initializedViewSchemas,

// Initialize all view schemas similarly
const initializedViewSchemas = Object.keys(automationviewSchemas).reduce((acc, viewName) => {
    const viewSchema = automationviewSchemas[viewName as keyof typeof automationviewSchemas];
    acc[viewName] = initializeViewSchema(viewSchema as ViewSchema); // Create this similar to initializeTableSchema
    return acc;
}, {} as Record<string, ViewSchema>);

 */
