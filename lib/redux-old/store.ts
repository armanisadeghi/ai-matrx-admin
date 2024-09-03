// File: @/lib/redux-old/store.ts

import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '@/features/counter/Slice';

import { middleware as counterMiddleware } from '@/features/counter/Middleware';
import orm from './orm';
import { createReducer } from 'redux-orm';
import {registeredFunctionReducer} from "@/features/registered-function/registeredFunctionFeature";

const rootReducer = {
    counter: counterReducer,
    registeredFunction: registeredFunctionReducer,
    orm: createReducer(orm),
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Disable serializable check for ORM
        }).concat(counterMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
