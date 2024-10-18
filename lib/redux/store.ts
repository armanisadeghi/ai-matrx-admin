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
import { initialSchemas } from "@/utils/schema/initialSchemas";
import { createTableSlice } from "@/lib/redux/tables/tableSliceCreator";
import { FrontendTableNames, TableSchema } from "@/types/tableSchemaTypes";

// Initialize saga middleware
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

// Stronger typing for tableReducers
const tableReducers = Object.keys(initialSchemas).reduce((acc, tableName) => {
    const tableSchema = initialSchemas[tableName as FrontendTableNames];
    const tableSlice = createTableSlice(tableName as FrontendTableNames, tableSchema);
    acc[tableName] = tableSlice.reducer;
    return acc;
}, {} as Record<FrontendTableNames, ReturnType<typeof createTableSlice<FrontendTableNames>>['reducer']>);

const rootReducer = combineReducers({
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
