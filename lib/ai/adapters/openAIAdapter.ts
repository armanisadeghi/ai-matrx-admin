// File: lib/ai/adapters/openAIAdapter.ts

import { BaseAdapter } from "./baseAdapter";
import OpenAI from 'openai';

export default class OpenAIAdapter implements BaseAdapter {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async streamResponse(message: string, onChunk: (chunk: string) => void): Promise<void> {
        const stream = await this.client.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: message }],
            stream: true,
        });

        for await (const part of stream) {
            const chunk = part.choices[0]?.delta?.content || "";
            if (chunk) onChunk(chunk);
        }
    }
}
