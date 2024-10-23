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
import {createTableSlice} from "@/lib/redux/tables/tableSliceCreator";
import { TableNames, AutomationTableStructure } from '@/types/automationTableTypes';
import {createRootSaga} from "@/lib/redux/rootSaga";
import { loggerMiddleware } from '@/lib/logger/redux-middleware';

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

type TableReducers = Record<TableNames, ReturnType<typeof createTableSlice>['reducer']>;

function createAutomationTableReducers(schema: AutomationTableStructure): TableReducers {
    return Object.entries(schema).reduce((acc, [tableName, tableSchema]) => {
        const tableSlice = createTableSlice(tableName as TableNames, tableSchema);
        acc[tableName as TableNames] = tableSlice.reducer;
        return acc;
    }, {} as TableReducers);
}

const createRootReducer = (schema: AutomationTableStructure) => {
    const tableReducers = createAutomationTableReducers(schema);

    return combineReducers({
        ...featureReducers,
        ...moduleReducers,
        ...tableReducers,
        layout: layoutReducer,
        theme: themeReducer,
        form: formReducer,
        user: userReducer,
        userPreferences: userPreferencesReducer,
        testRoutes: testRoutesReducer,
        flashcardChat: flashcardChatReducer,
        aiChat: aiChatReducer,
    });
};

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

    const rootSagaInstance = createRootSaga(initialState.schema.schema);
    sagaMiddleware.run(rootSagaInstance);

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;
