// lib/redux/rootReducer.ts
import { combineReducers, Reducer } from "@reduxjs/toolkit";
import { featureSchemas } from "./dynamic/featureSchema";
import { createFeatureSlice } from "./slices/featureSliceCreator";
import { createModuleSlice } from "./slices/moduleSliceCreator";
import { moduleSchemas, ModuleName } from "./dynamic/moduleSchema";
import layoutReducer from "./slices/layoutSlice";
import formReducer from "./slices/formSlice";
import userReducer from "./slices/userSlice";
import aiChatReducer from "./slices/aiChatSlice";
import userPreferencesReducer from "./slices/userPreferencesSlice";
import testRoutesReducer from "./slices/testRoutesSlice";
import flashcardChatReducer from "./slices/flashcardChatSlice";
import { themeReducer } from "@/styles/themes";
import { InitialReduxState } from "@/types/reduxTypes";
import { createGlobalCacheSlice } from "@/lib/redux/schema/globalCacheSlice";
import uiReducer from "./ui/uiSlice";
import {
  entitySliceRegistry,
  initializeEntitySlices,
} from "./entity/entitySlice";
import { fieldReducer } from "@/lib/redux/concepts/fields/fieldSlice";
import socketReducer from "./features/socket/socketSlice";
import notesReducer from "./notes/notesSlice";
import tagsReducer from "./notes/tagsSlice";
import { storageReducer } from "./storage";
import { createFileSystemSlice } from "./fileSystem/slice";
import { AvailableBuckets, FileManagement } from "./fileSystem/types";
import { UnifiedSchemaCache } from "@/types/entityTypes";

export const availableBuckets = [
  "userContent",
  "Audio",
  "Images",
  "Documents",
  "Videos",
  "Code",
  "any-file",
] as const;

export type FileSystemState = { [K in AvailableBuckets]: FileManagement };

const fileSystemReducers = availableBuckets.reduce<{ [K in AvailableBuckets]: Reducer<FileManagement> }>((acc, bucket) => {
  acc[bucket] = createFileSystemSlice(bucket).reducer;
  return acc;
}, {} as { [K in AvailableBuckets]: Reducer<FileManagement> });

const featureReducers = Object.keys(featureSchemas).reduce(
  (acc, featureName) => {
    const featureSchema =
      featureSchemas[featureName as keyof typeof featureSchemas];
    const featureSlice = createFeatureSlice(featureName as any, featureSchema);
    acc[featureName] = featureSlice.reducer;
    return acc;
  },
  {} as Record<string, any>
);

const moduleReducers = Object.keys(moduleSchemas).reduce((acc, moduleName) => {
  const moduleSchema = moduleSchemas[moduleName as keyof typeof moduleSchemas];
  const moduleSlice = createModuleSlice(moduleName as ModuleName, moduleSchema);
  acc[moduleName] = moduleSlice.reducer;
  return acc;
}, {} as Record<string, any>);

export const createRootReducer = (initialState: InitialReduxState) => {
  initializeEntitySlices(initialState.globalCache.schema);
  const entityReducers = Object.fromEntries(
    Array.from(entitySliceRegistry.entries()).map(([key, slice]) => [
      key,
      slice.reducer,
    ])
  );

  const globalCacheSlice = createGlobalCacheSlice(initialState.globalCache as UnifiedSchemaCache);

  return combineReducers({
    ...featureReducers,
    ...moduleReducers,
    fileSystem: combineReducers(fileSystemReducers) as Reducer<FileSystemState>,
    entities: combineReducers(entityReducers),
    entityFields: fieldReducer,
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
    socket: socketReducer,
    notes: notesReducer,
    tags: tagsReducer,
    storage: storageReducer,
  });
};