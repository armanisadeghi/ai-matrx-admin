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

export type Replacement = {
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

export type AssistantType =
    | 'debateCoach'
    | 'voiceAssistant'
    | 'mathTutor'
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
    previousMessages?: ServersideMessage[];
    assistantType?: AssistantType;
    replacements?: Replacement[];
    apiName?: ApiName;
    params?: AiCallParams;
};

export type AiResponse = {
    transcript?: string;
    responseType: ResponseType;
    response: string | ReadableStream;
    voiceStream?: ReadableStream;
}

export interface Assistant {
    id: AssistantType;
    name: string;
    title: string;
    description: string;
    imagePath: string;
    capabilities: string[];
}
