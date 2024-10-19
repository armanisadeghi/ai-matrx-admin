// File: lib/ai/adapters/baseAdapter.ts

export interface BaseAdapter {
    streamResponse(message: string, onChunk: (chunk: string) => void): Promise<void>;
}

export interface BaseOptionsAdapter {
    // Overload 1: Accepts message as string
    streamResponse(message: string, onChunk: (chunk: string) => void): Promise<void>;

    // Overload 2: Accepts message as object
    streamResponse(message: { role: string, content: string }, onChunk: (chunk: string) => void): Promise<void>;

    // Overload 3: Accepts message history and user message
    streamResponse(messageHistory: { role: string, content: string }[], userMessage: { role: string, content: string }, onChunk: (chunk: string) => void): Promise<void>;
}


