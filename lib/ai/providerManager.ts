// File: lib/ai/providerManager.ts

import { AIProvider } from "@/lib/ai/aiChat.types";
import OpenAIProvider from "./providers/openAIProvider";
import AnthropicProvider from "./providers/anthropicProvider";
// Import other providers as needed

class ProviderManager {
    private static instance: ProviderManager;
    private providers: Map<AIProvider, any>;

    private constructor() {
        this.providers = new Map();
        // this.providers.set(AIProvider.OpenAI, new OpenAIProvider());
        // this.providers.set(AIProvider.Anthropic, new AnthropicProvider());
        // Initialize other providers
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    public getProvider(provider: AIProvider) {
        return this.providers.get(provider);
    }
}

export default ProviderManager.getInstance();
