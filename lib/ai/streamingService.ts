// File: lib/ai/streamingService.ts

import { EventEmitter } from 'events';
import { AIProvider } from "@/lib/ai/aiChat.types";
import OpenAIAdapter from "./adapters/openAIAdapter";
import AnthropicAdapter from "./adapters/anthropicAdapter";

class StreamingService extends EventEmitter {
    private static instance: StreamingService;
    private adapters: Map<AIProvider, any>;

    private constructor() {
        super();
        this.adapters = new Map();
        // this.adapters.set(AIProvider.OpenAI, new OpenAIAdapter());
        // this.adapters.set(AIProvider.Anthropic, new AnthropicAdapter());
        // Initialize other adapters
    }

    public static getInstance(): StreamingService {
        if (!StreamingService.instance) {
            StreamingService.instance = new StreamingService();
        }
        return StreamingService.instance;
    }

    public async streamResponse(provider: AIProvider, message: string, onChunk: (chunk: string) => void): Promise<string> {
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            throw new Error(`No adapter found for provider ${provider}`);
        }

        let fullResponse = '';

        await adapter.streamResponse(message, (chunk: string) => {
            fullResponse += chunk;
            onChunk(chunk);
            this.emit('chunk', chunk);
        });

        this.emit('complete', fullResponse);
        return fullResponse;
    }
}

export default StreamingService.getInstance();
