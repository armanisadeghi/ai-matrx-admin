/*
// lib/redux/actions/aiActions.ts

import { createAction } from '@reduxjs/toolkit';

export const startAICall = createAction<{ prompt: string; aiModel: 'OpenAI' | 'Anthropic'; requestId: string }>(
    'AI/START_CALL'
);
export const aiCallSuccess = createAction<{ response: string; aiModel: string; requestId: string }>(
    'AI/CALL_SUCCESS'
);
export const aiCallFailure = createAction<{ error: any; aiModel: string; requestId: string }>('AI/CALL_FAILURE');


// lib/redux/sagas/aiSaga.ts

import { call, put, takeEvery, all } from 'redux-saga/effects';
import { startAICall, aiCallSuccess, aiCallFailure } from '../actions/aiActions';
import { SocketManager } from '@/lib/socket/SocketManager';
import { v4 as uuidv4 } from 'uuid';

function* handleAICall(action: ReturnType<typeof startAICall>) {
    const { prompt, aiModel, requestId } = action.payload;
    try {
        let response: string;
        if (aiModel === 'OpenAI') {
            response = yield call(callOpenAIApi, prompt);
        } else if (aiModel === 'Anthropic') {
            response = yield call(callAnthropicApi, prompt);
        } else {
            throw new Error('Unsupported AI model');
        }

        yield put(aiCallSuccess({ response, aiModel, requestId }));

        // Emit socket event to notify backend
        const socketManager = SocketManager.getInstance();
        socketManager.emit('ai/response', { response, aiModel, requestId });
    } catch (error) {
        yield put(aiCallFailure({ error, aiModel, requestId }));
    }
}

function* watchAICalls() {
    yield takeEvery(startAICall.type, handleAICall);
}

export function* aiSaga() {
    yield all([watchAICalls()]);
}

// Helper functions to call APIs
function callOpenAIApi(prompt: string): Promise<string> {
    // Implement the API call to OpenAI
}

function callAnthropicApi(prompt: string): Promise<string> {
    // Implement the API call to Anthropic
}
*/


/*



// lib/redux/slices/aiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { startAICall, aiCallSuccess, aiCallFailure } from '../actions/aiActions';

interface AIState {
    requests: Record<
        string,
        {
            status: 'pending' | 'success' | 'failure';
            response?: string;
            error?: any;
            aiModel: string;
        }
    >;
}

const initialState: AIState = {
    requests: {},
};

const aiSlice = createSlice({
    name: 'ai',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(startAICall, (state, action) => {
                const { requestId, aiModel } = action.payload;
                state.requests[requestId] = { status: 'pending', aiModel };
            })
            .addCase(aiCallSuccess, (state, action) => {
                const { requestId, response } = action.payload;
                state.requests[requestId] = { status: 'success', response, aiModel: state.requests[requestId].aiModel };
            })
            .addCase(aiCallFailure, (state, action) => {
                const { requestId, error } = action.payload;
                state.requests[requestId] = { status: 'failure', error, aiModel: state.requests[requestId].aiModel };
            });
    },
});

export default aiSlice.reducer;
*/



/*



// components/MyComponent.tsx

import React from 'react';
import { useDispatch } from 'react-redux';
import { startAICall } from '@/lib/redux/actions/aiActions';
import { v4 as uuidv4 } from 'uuid';

function MyComponent() {
    const dispatch = useDispatch();

    const handleAICall = (prompt: string, aiModel: 'OpenAI' | 'Anthropic') => {
        const requestId = uuidv4();
        dispatch(startAICall({ prompt, aiModel, requestId }));
    };

    return (
        <button onClick={() => handleAICall('Hello, AI!', 'OpenAI')}>
    Send AI Request
    </button>
);
}

export default MyComponent;
*/
