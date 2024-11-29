// redux/features/config/configSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Environment = 'local' | 'devServer' | 'prodServer';

interface ConfigState {
    env: Environment;
    sessionUrl: string;
    socketNamespace: string;
}

const initialState: ConfigState = {
    env: 'devServer',
    sessionUrl: 'https://dev-back.aimatrixengine.com',
    socketNamespace: '/UserSession',
};

const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        setEnvironment: (state, action: PayloadAction<Environment>) => {
            state.env = action.payload;
            state.sessionUrl = getSessionUrl(action.payload);
        },
        setSocketNamespace: (state, action: PayloadAction<string>) => {
            state.socketNamespace = action.payload;
        },
    },
});

export const { setEnvironment, setSocketNamespace } = configSlice.actions;

export default configSlice.reducer;

function getSessionUrl(env: Environment): string {
    const urlMap = {
        local: 'http://localhost:8000',
        devServer: 'https://dev-back.aimatrixengine.com',
        prodServer: 'https://prod-back.aimatrixengine.com',
    };
    return urlMap[env];
}
