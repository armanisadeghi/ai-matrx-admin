// lib/cartesia/cartesia.types.ts


export type Emotion = "anger" | "sadness" | "positivity" | "curiosity" | "surprise";

export enum EmotionName {
    ANGER = "anger",
    POSITIVITY = "positivity",
    SURPRISE = "surprise",
    SADNESS = "sadness",
    CURIOSITY = "curiosity",
}

export type Intensity = "lowest" | "low" | "high" | "highest" | "";

export enum EmotionLevel {
    LOWEST = "lowest",
    LOW = "low",
    MEDIUM = "",
    HIGH = "high",
    HIGHEST = "highest",
}

export type EmotionControl = Emotion | `${Emotion}:${Intensity}`;

export type VoiceSpecifier = {
    mode?: "id",
    id: string
} | {
    mode?: "embedding",
    embedding: number[]
}

export type VoiceOptions = VoiceSpecifier & {
    __experimental_controls?: {
        speed?: "slowest" | "slow" | "normal" | "fast" | "fastest";
        emotion?: EmotionControl[];
    };
};

export enum VoiceSpeed {
    SLOWEST = "slowest",
    SLOW = "slow",
    NORMAL = "normal",
    FAST = "fast",
    FASTEST = "fastest",
}

export enum AudioEncoding {
    PCM_S16LE = "pcm_s16le",
    PCM_F32LE = "pcm_f32le",
    PCM_MULAW = "pcm_mulaw",
    PCM_ALAW = "pcm_alaw",
}

export enum Language {
    EN = "en",
    DE = "de",
    ES = "es",
    FR = "fr",
    JA = "ja",
    PT = "pt",
    ZH = "zh",
    HI = "hi",
    IT = "it",
    KO = "ko",
    NL = "nl",
    PL = "pl",
    RU = "ru",
    SV = "sv",
    TR = "tr",
}

export enum OutputContainer {
    Raw = "raw",
    Mp3 = "mp3",
    Wave = "wave",
}

export interface OutputFormat {
    container: "raw";
    encoding: AudioEncoding;
    sample_rate: number;
}

// Additional types based on the initial example
export enum ModelId {
    SonicEnglish = "sonic-english",
    SonicMultilingual = "sonic-multilingual",
    // Custom models can be added here if needed
}

export interface TTSRequestBody {
    model_id: ModelId;
    transcript: string;
    voice: VoiceOptions;
    output_format: OutputFormat;
    language: Language;
    duration: number;
}


// Type for Publish Payload (WebSocket request body)
interface PublishPayload {
    context_id: string;
    model_id: string;
    transcript: string;
    voice: {
        mode: VoiceMode;
        __experimental_controls?: {
            speed?: VoiceSpeed;
            emotion?: (EmotionName | `${EmotionName}:${EmotionLevel}`)[];
        };
        id?: string; // Only if mode is ID
        embedding?: number[]; // Only if mode is EMBEDDING
    };
    output_format: OutputFormat;
    duration?: number;
    language?: Language;
    add_timestamps?: boolean;
}

export type StreamRequest = {
    model_id: string;
    transcript: string;
    voice: VoiceOptions;
    output_format?: {
        container: string;
        encoding: string;
        sample_rate: number;
    };
    context_id?: string;
    continue?: boolean;
    duration?: number;
    language?: string;
    add_timestamps?: boolean;
};


enum VoiceMode {
    ID = "id",
    EMBEDDING = "embedding",
}


interface ClientOptions {
    apiKey?: string | (() => Promise<string>);
    baseUrl?: string;
}

export type Sentinel = null;
export type Chunk = string | Sentinel;
export type ConnectionEventData = {
    open: never;
    close: never;
};


type StreamOptions = {
    timeout?: number;
};
type WebSocketBaseResponse = {
    context_id: string;
    status_code: number;
    done: boolean;
};
type CloneOptions = {
    mode: "url";
    link: string;
    enhance?: boolean;
} | {
    mode: "clip";
    clip: Blob;
    enhance?: boolean;
};

interface VoiceToMix {
    id?: string;
    embedding?: number[];
    weight: number;
}

interface MixVoicesOptions {
    voices: VoiceToMix[];
}

type Voice = {
    id: string;
    name: string;
    description: string;
    embedding: number[];
    is_public: boolean;
    user_id: string;
    created_at: string;
    language: string;
};
type CreateVoice =
    Pick<Voice, "name" | "description" | "embedding">
    & Partial<Omit<Voice, "name" | "description" | "embedding">>;
type UpdateVoice = Partial<Pick<Voice, "name" | "description" | "embedding">>;
type CloneResponse = {
    embedding: number[];
};
type MixVoicesResponse = {
    embedding: number[];
};


function formatEmotionControl(emotion: Emotion, intensity: Intensity): string {
    return intensity ? `${emotion}:${intensity}` : emotion;
}




// // Type for WebSocket Response
// export interface WebSocketResponse {
//     type?: string;
//     done?: boolean;
//     status_code?: number;
//     step_time?: number;
//     context_id?: string;
//     data?: string;
//     word_timestamps?: WordTimestamp;
// }


/*
const samplePayload = {
    "context_id": "happy-monkeys-fly",
    "model_id": "sonic-english",
    "transcript": "Hello, world! I'\''m generating audio on Cartesia.",
    "duration": 180,
    "voice": {
        "mode": "id",
        "id": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "__experimental_controls": {
            "speed": "normal",
            "emotion": ["positivity:highest", "curiosity"]
        }
    },
    "output_format": {
        "container": "raw",
        "encoding": "pcm_s16le",
        "sample_rate": 8000
    },
    "language": "en",
    "add_timestamps": false
}

const sampleCancelPayload = {
    "context_id": "happy-monkeys-fly",
    "cancel": true,
}

const sampleResponse = {
    "status_code": 206,
    "done": false,
    "type": "chunk",
    "data": "aSDinaTvuI8gbWludGxpZnk=",
    "step_time": 123,
    "context_id": "happy-monkeys-fly"
}

const sampleWebsocketResponse = {
    "status_code": 206,
    "done": false,
    "context_id": "happy-monkeys-fly",
    "type": "timestamps",
    "word_timestamps": {
        "words": ["Hello"],
        "start": [0.0],
        "end": [1.0]
    }
}

const sampleStreamingParts = [
    {"transcript": "Hello, Sonic!", "continue": true, "context_id": "happy-monkeys-fly"},
    {"transcript": " I'm streaming ", "continue": true, "context_id": "happy-monkeys-fly"},
    {"transcript": "inputs.", "continue": false, "context_id": "happy-monkeys-fly"},
]

const sampleStreamingPartsUnknownEnd = [
    {"transcript": "Hello, Sonic!", "continue": true, "context_id": "happy-monkeys-fly"},
    {"transcript": " I'm streaming ", "continue": true, "context_id": "happy-monkeys-fly"},
    {"transcript": "inputs.", "continue": true, "context_id": "happy-monkeys-fly"},
    {"transcript": "", "continue": false, "context_id": "happy-monkeys-fly"},
]

*/