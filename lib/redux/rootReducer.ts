// lib/redux/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
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
import {InitialReduxState} from "@/types/reduxTypes";
import { createGlobalCacheSlice } from "@/lib/redux/schema/globalCacheSlice";
import uiReducer from './ui/uiSlice';
import {entitySliceRegistry, initializeEntitySlices} from './entity/entitySlice';
import {fieldReducer} from "@/lib/redux/concepts/fields/fieldSlice";
import socketReducer from './features/socket/socketSlice';

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

export const createRootReducer = (initialState: InitialReduxState) => {
        initializeEntitySlices(initialState.globalCache.schema);
    const entityReducers = Object.fromEntries(
        Array.from(entitySliceRegistry.entries()).map(([key, slice]) => [key, slice.reducer])
    );

    const globalCacheSlice = createGlobalCacheSlice(initialState.globalCache);

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
        globalCache: globalCacheSlice.reducer,
        ui: uiReducer,
        formFields: fieldReducer,
        socket: socketReducer,
    });
};


// import chatReducer from './features/aiChats/chatSlice';
// import messageReducer from './features/aiChats/messageSlice';
// import uiReducer from './features/aiChats/uiSlice';
// import functionsReducer from './features/functions/functionsSlice';
// import userReducer from './features/user/userSlice';
// import settingsReducer from './features/settings/settingsSlice';
// import recipeReducer from './features/recipes/recipeSlice';
// import brokerReducer from './features/broker/brokerSlice';
// import socketReducer from './features/socket/socketSlice';
// import dynamicEventsReducer from './features/dynamicEvents/dynamicEventsSlice';
// import configReducer from './features/config/configSlice';
//
// const rootReducer = combineReducers({
//     chats: chatReducer,
//     messages: messageReducer,
//     ui: uiReducer,
//     functions: functionsReducer,
//     user: userReducer,
//     settings: settingsReducer,
//     recipes: recipeReducer,
//     brokers: brokerReducer,
//     socket: socketReducer,
//     dynamicEvents: dynamicEventsReducer,
//     config: configReducer,




/*
type EntityReducers = Record<EntityKeys, ReturnType<typeof createEntitySlice>['reducer']>;


function createEntityReducers(automationEntities: AutomationEntities): EntityReducers {
    return Object.entries(automationEntities).reduce((acc, [entityName, entitySchema]) => {
        const { initialState, metadata } = initializeEntitySlice(
            entityName as EntityKeys,
            entitySchema
        );
        const entitySlice = createEntitySlice(entityName as EntityKeys, initialState);
        acc[entityName as EntityKeys] = entitySlice.reducer;
        return acc;
    }, {} as EntityReducers);
}
*/



/*
function createEntityReducers(automationEntities: AutomationEntities): EntityReducers {
    return Object.entries(automationEntities).reduce((acc, [entityName, entitySchema]) => {
        const { initialState, metadata } = initializeEntitySlice(
            entityName as EntityKeys,
            entitySchema
        );
        const entitySlice = createEntitySlice(entityName as EntityKeys, initialState);
        acc[entityName as EntityKeys] = entitySlice.reducer;
        return acc;
    }, {} as EntityReducers);
}
*/


/*
function createEntityReducers(automationEntities: AutomationEntities): EntityReducers {
    return Object.entries(automationEntities).reduce((acc, [entityName, entitySchema]) => {
        const entitySlice = createEntitySlice(entityName as EntityKeys, entitySchema);
        acc[entityName as EntityKeys] = entitySlice.reducer;
        return acc;
    }, {} as EntityReducers);
}
*/
