// File: lib/ai/adapters/anthropicAdapter.ts

import { BaseAdapter } from "./baseAdapter";
import {anthropic, AnthropicProvider} from '@ai-sdk/anthropic';
import { generateText, streamText, generateObject, streamObject } from 'ai';

export default class AnthropicAdapter implements BaseAdapter {
    private client:  AnthropicProvider;

    constructor() {
        // this.client = new anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    async streamResponse(message: string, onChunk: (chunk: string) => void): Promise<void> {
        // const stream = await this.client.completions.create({
        //     model: "claude-2",
        //     prompt: message,
        //     stream: true,
        // });

        // for await (const completion of stream) {
        //     if (completion.completion) onChunk(completion.completion);
        // }
    }
}
