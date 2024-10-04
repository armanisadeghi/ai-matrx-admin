// File: lib/ai/aiChatHelpers.ts

import { AIProvider } from './aiChat.types';

interface ModuleConfig {
    provider: AIProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

interface JobConfig {
    module: string;
    job: string;
}

export const initializeModule = (config: ModuleConfig) => {
    return {
        provider: config.provider,
        config: {
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: config.stream,
        },
    };
};

export const initializeJob = (moduleConfig: ReturnType<typeof initializeModule>, jobConfig: JobConfig) => {
    return {
        ...moduleConfig,
        module: jobConfig.module,
        job: jobConfig.job,
    };
};
