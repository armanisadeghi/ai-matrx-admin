// File: lib/ai/providers/openAIProvider.ts

import { BaseProvider } from "../baseProvider";
import OpenAI from 'openai'; // Assuming you're using the OpenAI npm package

export default class OpenAIProvider implements BaseProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async sendMessage(message: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: message }],
        });
        return response.choices[0].message.content || "";
    }
}
