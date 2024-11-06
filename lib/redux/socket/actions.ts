// lib/redux/socket/actions.ts

import { createAction } from '@reduxjs/toolkit';

export const socketInitialized = createAction('SOCKET_INITIALIZED');

export const startAICall = createAction<{ prompt: string; aiModel: 'OpenAI' | 'Anthropic'; requestId: string }>(
    'AI/START_CALL'
);
export const aiCallSuccess = createAction<{ response: string; aiModel: string; requestId: string }>(
    'AI/CALL_SUCCESS'
);
export const aiCallFailure = createAction<{ error: any; aiModel: string; requestId: string }>('AI/CALL_FAILURE');
