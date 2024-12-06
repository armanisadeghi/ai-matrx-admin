export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    latency?: number;
    timestamp: number;
};

export type Conversation = {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
};

export type ProcessState = {
    recording: boolean;
    processing: boolean;
    transcribing: boolean;
    generating: boolean;
    speaking: boolean;
};

export type ApiName = 'groq' | 'openai' | 'anthropic';

export type ServersideMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export type PreDefinedMessages = Record<string, ServersideMessage[]>;

export type PartialBroker = {
    id: string;
    value: string;
};

export type InputType = 'text' | 'audio';
export type ResponseType = 'text' | 'audio' | 'streamingText';

export type AiCallParams = {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
};

export type AvailableAssistants =
    | 'defaultVoiceAssistant'
    | 'voiceAssistant'
    | 'debateCoach'
    | 'mathTutor'
    | 'mathTutorGPT'
    | 'historyTeacher'
    | 'scienceTeacher'
    | 'englishTeacher'
    | 'reactDevelopmentExpert'
    | 'pythonDevelopmentExpert'
    | 'typeScriptDevelopmentExpert'
    | 'businessCoach'
    | 'hrExpert'
    | 'candy';


export type ProcessAiRequestParams = {
    input: string | File;
    inputType: InputType;
    responseType: ResponseType
    voiceId?: string;
    previousMessages?: ServersideMessage[];
    assistant?: AvailableAssistants;
    partialBrokers?: PartialBroker[];
    apiName?: ApiName;
    aiCallParams?: AiCallParams;
};

export type AiResponse = {
    transcript?: string;
    responseType: ResponseType;
    response: string | ReadableStream;
    voiceStream?: ReadableStream;
}

export interface Assistant {
    id: AvailableAssistants;
    name: string;
    title: string;
    description: string;
    imagePath: string;
    capabilities: string[];
}
