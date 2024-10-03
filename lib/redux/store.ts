// lib/redux/store.ts

import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { combineReducers } from '@reduxjs/toolkit';
import { featureSchemas } from './featureSchema';
import { createFeatureSlice } from './sliceCreator';
import layoutReducer from './slices/layoutSlice';
import formReducer from './slices/formSlice';
import userReducer from './slices/userSlice';
import userPreferencesReducer from './slices/userPreferencesSlice';
import testRoutesReducer from './slices/testRoutesSlice';
import flashcardChatReducer from './slices/flashcardChatSlice';
import { themeReducer } from "@/styles/themes";

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
    theme: themeReducer,
    form: formReducer,
    user: userReducer,
    userPreferences: userPreferencesReducer,
    testRoutes: testRoutesReducer,
    flashcardChat: flashcardChatReducer,
});

export const makeStore = (initialState?: ReturnType<typeof rootReducer>) => {
    return configureStore({
        reducer: rootReducer,
        preloadedState: initialState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(sagaMiddleware),
        devTools: process.env.NODE_ENV !== 'production',
    });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
>;
