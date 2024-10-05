// File: lib/ai/adapters/baseAdapter.ts

export interface BaseAdapter {
    streamResponse(message: string, onChunk: (chunk: string) => void): Promise<void>;
}
