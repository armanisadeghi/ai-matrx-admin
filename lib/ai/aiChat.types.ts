// File: lib/ai/aiChat.types.ts

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'groq' | 'matrx' | 'other';

export interface ContentPart {
    type: 'text' | 'image_url' | 'function_call' | 'function_response';
    content: string | { url: string } | object;
}

export interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
    content: ContentPart[];
    isVisibleToUser: boolean;
    createdAt: string;
}

export interface Chat {
    id: string;
    userId: string;
    provider: AIProvider;
    module: string;
    job: string;
    messages: Message[];
    fullResponse?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
