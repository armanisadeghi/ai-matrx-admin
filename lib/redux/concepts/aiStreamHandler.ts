// lib/redux/thunks/aiStreamHandler.ts

import { AppThunk } from '@/lib/redux/store';

export const streamAIResponse = (flashcardId: string, onStreamChunk: (chunk: string) => void): AppThunk => {
    return async (dispatch, getState) => {
        // Assuming you have some API call that supports streaming
        const apiEndpoint = `/api/ai/stream/${flashcardId}`;

        const response = await fetch(apiEndpoint);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        let done = false;
        let fullResponse = '';

        while (!done) {
            const { value, done: streamDone } = await reader!.read();
            done = streamDone;

            // Decode the streamed chunk and pass it to the callback
            const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
            onStreamChunk(chunk);

            // Accumulate the full response for further processing if needed
            fullResponse += chunk;
        }

        // Dispatch full response once it's fully streamed and processed
        dispatch({
            type: 'aiChat/completeAIChat',
            payload: { flashcardId, fullResponse },
        });
    };
};
