// // lib/redux/socket/actions.ts
// import { createAction } from '@reduxjs/toolkit';

// export const socketInitialized = createAction<{
//     server: string | null;
//     namespace: string;
//     isConnected: boolean;
//     isAuthenticated: boolean;
// }>('SOCKET_INITIALIZED');

// export const socketConnecting = createAction('SOCKET_CONNECTING');

// export const socketConnected = createAction<{
//     server: string | null;
//     namespace: string;
//     isConnected: boolean;
//     isAuthenticated: boolean;
// }>('SOCKET_CONNECTED');

// export const socketDisconnected = createAction('SOCKET_DISCONNECTED');

// export const socketError = createAction<string>('SOCKET_ERROR');

// // AI and Stream actions remain unchanged
// export const startAICall = createAction<{ prompt: string; aiModel: 'OpenAI' | 'Anthropic'; requestId: string }>(
//     'AI/START_CALL'
// );
// export const aiCallSuccess = createAction<{ response: string; aiModel: string; requestId: string }>(
//     'AI/CALL_SUCCESS'
// );
// export const aiCallFailure = createAction<{ error: any; aiModel: string; requestId: string }>('AI/CALL_FAILURE');

// export const START_STREAM = 'STREAM/START';
// export const STREAM_UPDATE = 'STREAM/UPDATE';
// export const STREAM_ERROR = 'STREAM/ERROR';
// export const STREAM_COMPLETE = 'STREAM/COMPLETE';
// export const STREAM_INFO = 'STREAM/INFO';

// export const startStream = (eventName: string) => ({
//     type: START_STREAM,
//     payload: { eventName },
// });

// export const streamUpdate = (eventName: string, chunk: string, fullText: string) => ({
//     type: STREAM_UPDATE,
//     payload: { eventName, chunk, fullText },
// });

// export const streamError = (eventName: string, error: string, isFatal: boolean) => ({
//     type: STREAM_ERROR,
//     payload: { eventName, error, isFatal },
// });

// export const streamComplete = (eventName: string, fullText: string) => ({
//     type: STREAM_COMPLETE,
//     payload: { eventName, fullText },
// });

// export const streamInfo = (eventName: string, status: string, message: string, data?: any) => ({
//     type: STREAM_INFO,
//     payload: { eventName, status, message, data },
// });