// lib/redux/store.ts

import { combineReducers } from '@reduxjs/toolkit';
import { featureSchemas } from './dynamic/featureSchema';
import { createFeatureSlice } from './slices/featureSliceCreator';
import { createModuleSlice } from './slices/moduleSliceCreator';
import schemaReducer from './slices/schemaSlice'
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
import {AutomationTableStructure, TableKeys} from '@/types/automationTableTypes';

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

type TableReducers = Record<TableKeys, ReturnType<typeof createTableSlice>['reducer']>;

function createAutomationTableReducers(schema: AutomationTableStructure): TableReducers {
    return Object.entries(schema).reduce((acc, [tableName, tableSchema]) => {
        const tableSlice = createTableSlice(tableName as TableKeys, tableSchema);
        acc[tableName as TableKeys] = tableSlice.reducer;
        return acc;
    }, {} as TableReducers);
}

export const createRootReducer = (schema: AutomationTableStructure) => {
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
        schema: schemaReducer,
    });
};

