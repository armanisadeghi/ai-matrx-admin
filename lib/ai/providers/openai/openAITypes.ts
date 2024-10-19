// File: lib/ai/types/openAITypes.ts

import OpenAI from 'openai';

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
    role: Role;
    content: string;
}

export type OnChunkFunction = (chunk: string) => void;

export interface BaseAdapterInterface {
    streamResponse(message: string | Message | Message[], onChunk: OnChunkFunction, userMessage?: Message): Promise<void>;
}

export type OpenAIClientConfig = {
    apiKey: string;
    dangerouslyAllowBrowser: boolean;
};

export type OpenAIStreamResponse = AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
