// constants/aiProviders.ts
export const AI_PROVIDERS = {
    anthropic: {
        name: 'Anthropic',
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3 Haiku' },
        ]
    },
    openai: {
        name: 'OpenAI',
        models: [
            { id: 'o1-preview', name: 'o1 Preview' },
            { id: 'o1-mini', name: 'o1 Mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o-Mini' },
            { id: 'gpt-4o-audio-preview', name: 'GPT-4o Audio Preview' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'someId', name: 'somename', contextWindow: 5555, developer: 'someCompany' },
        ]
    },
    groq: {
        name: 'Groq',
        models: [
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', contextWindow: 8192, developer: 'Google' },
            { id: 'gemma-7b-it', name: 'Gemma 7B IT', contextWindow: 8192, developer: 'Google' },
            { id: 'llama-3.1-70b-versatile', name: 'LLaMA 3.1 70B Versatile', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B Instant', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-guard-3-8b', name: 'LLaMA Guard 3 8B', contextWindow: 8192, developer: 'Meta' },
            { id: 'llama3-70b-8192', name: 'LLaMA 3 70B 8192', contextWindow: 8192, developer: 'Meta' },
            { id: 'llama3-8b-8192', name: 'LLaMA 3 8B 8192', contextWindow: 8192, developer: 'Meta' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32768', contextWindow: 32768, developer: 'Mistral' },
            { id: 'llama3-groq-70b-8192-tool-use-preview', name: 'LLaMA 3 Groq 70B 8192 Tool Use Preview', contextWindow: 8192, developer: 'Groq' },
            { id: 'llama3-groq-8b-8192-tool-use-preview', name: 'LLaMA 3 Groq 8B 8192 Tool Use Preview', contextWindow: 8192, developer: 'Groq' },
            { id: 'llama-3.1-70b-specdec', name: 'LLaMA 3.1 70B SpecDec', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-3.2-1b-preview', name: 'LLaMA 3.2 1B Preview', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-3.2-3b-preview', name: 'LLaMA 3.2 3B Preview', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-3.2-11b-vision-preview', name: 'LLaMA 3.2 11B Vision Preview', contextWindow: 128000, developer: 'Meta' },
            { id: 'llama-3.2-90b-vision-preview', name: 'LLaMA 3.2 90B Vision Preview', contextWindow: 128000, developer: 'Meta' }
        ]
    }
} as const;

export const TRANSCRIPTION_PROVIDERS = {
    groq: {
        name: 'Groq',
        models: [
            { id: 'whisper-large-v3', name: 'Whisper Large V3' },
            { id: 'whisper-large-v3-turbo', name: 'Whisper Large V3 Turbo' },
            { id: 'distil-whisper-large-v3-en', name: 'Distilled Whisper Large V3 English' },
        ]
    },
    openai: {
        name: 'OpenAI',
        models: [
            { id: 'o1-preview', name: 'o1 Preview' },
            { id: 'o1-mini', name: 'o1 Mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o-Mini' },
            { id: 'gpt-4o-audio-preview', name: 'GPT-4o Audio Preview' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        ]
    },
} as const;
