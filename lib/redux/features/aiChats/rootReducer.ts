// redux/features/aiChats/rootReducer.ts

import { combineReducers } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import uiReducer from './uiSlice';

const rootReducer = combineReducers({
    chat: chatReducer,
    ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
