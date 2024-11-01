// lib/redux/store.ts

import { combineReducers } from '@reduxjs/toolkit';
import { featureSchemas } from './dynamic/featureSchema';
import { createFeatureSlice } from './slices/featureSliceCreator';
import { createModuleSlice } from './slices/moduleSliceCreator';
import schemaReducer from './slices/globalCacheSlice'
import { moduleSchemas, ModuleName } from './dynamic/moduleSchema';
import layoutReducer from './slices/layoutSlice';
import formReducer from './slices/formSlice';
import userReducer from './slices/userSlice';
import aiChatReducer from './slices/aiChatSlice';
import userPreferencesReducer from './slices/userPreferencesSlice';
import testRoutesReducer from './slices/testRoutesSlice';
import flashcardChatReducer from './slices/flashcardChatSlice';
import { themeReducer } from '@/styles/themes';
import {createEntitySlice} from "@/lib/redux/entity/entitySliceCreator";
import {AutomationEntities, EntityKeys} from "@/types/entityTypes";
import {InitialReduxState} from "@/types/reduxTypes";

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

const entityReducers = Object.keys(automationEntities).reduce((acc, entityName) => {
    const entitySchema = automationEntities[entityName as keyof typeof moduleSchemas];
    const moduleSlice = createModuleSlice(moduleName as ModuleName, moduleSchema);
    acc[moduleName] = moduleSlice.reducer;
    return acc;
}, {} as Record<string, any>);




type EntityReducers = Record<EntityKeys, ReturnType<typeof createEntitySlice>['reducer']>;

function createAutomationEntityReducers(automationEntities: AutomationEntities): EntityReducers {
    return Object.entries(automationEntities).reduce((acc, [entityName, entitySchema]) => {
        const entitySlice = createEntitySlice(entityName as EntityKeys, entitySchema);
        acc[entityName as EntityKeys] = entitySlice.reducer;
        return acc;
    }, {} as EntityReducers);
}

export const createRootReducer = (initialState: InitialReduxState) => {
    const entityReducers = createAutomationEntityReducers(initialState.globalCache.schema);

    return combineReducers({
        ...featureReducers,
        ...moduleReducers,
        entities: combineReducers(entityReducers),
        layout: layoutReducer,
        theme: themeReducer,
        form: formReducer,
        user: userReducer,
        userPreferences: userPreferencesReducer,
        testRoutes: testRoutesReducer,
        flashcardChat: flashcardChatReducer,
        aiChat: aiChatReducer,
        globalCache: schemaReducer,
    });
};
