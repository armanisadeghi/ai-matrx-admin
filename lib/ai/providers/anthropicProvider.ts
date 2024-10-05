// File: lib/ai/providers/anthropicProvider.ts

import { BaseProvider } from "./baseProvider";
import Anthropic from '@anthropic-ai/sdk'; // Assuming you're using the Anthropic npm package

export default class AnthropicProvider implements BaseProvider {
    private client: Anthropic;

    constructor() {
        this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    async sendMessage(message: string): Promise<string> {
        const response = await this.client.completions.create({
            model: "claude-2",
            prompt: message,
            max_tokens_to_sample: 300,
        });
        return response.completion;
    }
}
