// File: @/lib/store.ts

import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '@/features/counter/Slice';
import { middleware } from '@/features/counter/Middleware';

const rootReducer = {
    counter: counterReducer,
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(middleware),
});

export type RootState = {
    counter: ReturnType<typeof counterReducer>;
};

export type AppDispatch = typeof store.dispatch;
