// lib/cartesia/cartesia.types.ts


import emittery__default from 'emittery';

interface ClientOptions {
    apiKey?: string | (() => Promise<string>);
    baseUrl?: string;
}
type Sentinel = null;
type Chunk = string | Sentinel;
type ConnectionEventData = {
    open: never;
    close: never;
};
type VoiceSpecifier = {
    mode?: "id";
    id: string;
} | {
    mode?: "embedding";
    embedding: number[];
};
type Emotion = "anger" | "sadness" | "positivity" | "curiosity" | "surprise";

type Intensity = "lowest" | "low" | "high" | "highest";

type EmotionControl = Emotion | `${Emotion}:${Intensity}`;

type VoiceOptions = VoiceSpecifier & {
    __experimental_controls?: {
        speed?: "slowest" | "slow" | "normal" | "fast" | "fastest" | number;
        emotion?: EmotionControl[];
    };
};
type StreamRequest = {
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
type StreamOptions = {
    timeout?: number;
};
type WebSocketBaseResponse = {
    context_id: string;
    status_code: number;
    done: boolean;
};
type WordTimestamps = {
    words: string[];
    start: number[];
    end: number[];
};
type WebSocketTimestampsResponse = WebSocketBaseResponse & {
    type: "timestamps";
    word_timestamps: WordTimestamps;
};
type WebSocketChunkResponse = WebSocketBaseResponse & {
    type: "chunk";
    data: string;
    step_time: number;
};
type WebSocketErrorResponse = WebSocketBaseResponse & {
    type: "error";
    error: string;
};
type WebSocketResponse = WebSocketTimestampsResponse | WebSocketChunkResponse | WebSocketErrorResponse;
type EmitteryCallbacks<T> = {
    on: emittery__default<T>["on"];
    off: emittery__default<T>["off"];
    once: emittery__default<T>["once"];
    events: emittery__default<T>["events"];
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
type CreateVoice = Pick<Voice, "name" | "description" | "embedding"> & Partial<Omit<Voice, "name" | "description" | "embedding">>;
type UpdateVoice = Partial<Pick<Voice, "name" | "description" | "embedding">>;
type CloneResponse = {
    embedding: number[];
};
type MixVoicesResponse = {
    embedding: number[];
};
type WebSocketOptions = {
    container?: string;
    encoding?: string;
    sampleRate: number;
};
type SourceEventData = {
    enqueue: never;
    close: never;
    wait: never;
    read: never;
};
type TypedArray = Float32Array | Int16Array | Uint8Array;
type Encoding = "pcm_f32le" | "pcm_s16le" | "pcm_alaw" | "pcm_mulaw";

export type { Chunk, ClientOptions, CloneOptions, CloneResponse, ConnectionEventData, CreateVoice, EmitteryCallbacks, Emotion, EmotionControl, Encoding, Intensity, MixVoicesOptions, MixVoicesResponse, Sentinel, SourceEventData, StreamOptions, StreamRequest, TypedArray, UpdateVoice, Voice, VoiceOptions, VoiceSpecifier, VoiceToMix, WebSocketBaseResponse, WebSocketChunkResponse, WebSocketErrorResponse, WebSocketOptions, WebSocketResponse, WebSocketTimestampsResponse, WordTimestamps };



// Enum for Voice Modes
export enum VoiceMode {
    ID = "id",
    EMBEDDING = "embedding",
}

// Enum for Voice Speeds
export enum VoiceSpeed {
    SLOWEST = "slowest",
    SLOW = "slow",
    NORMAL = "normal",
    FAST = "fast",
    FASTEST = "fastest",
    CUSTOM = "custom", // Custom speed, represented as a double
}

// Enum for Audio Encodings
export enum AudioEncoding {
    PCM_S16LE = "pcm_s16le",
    PCM_F32LE = "pcm_f32le",
    PCM_MULAW = "pcm_mulaw",
    PCM_ALAW = "pcm_alaw",
}

// Enum for Languages
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

// Enum for Emotion Names
export enum EmotionName {
    ANGER = "anger",
    POSITIVITY = "positivity",
    SURPRISE = "surprise",
    SADNESS = "sadness",
    CURIOSITY = "curiosity",
}

// Enum for Emotion Levels
export enum EmotionLevel {
    LOWEST = "lowest",
    LOW = "low",
    MEDIUM = "", // Medium level, as per the documentation, is represented by an empty string
    HIGH = "high",
    HIGHEST = "highest",
}


// Type for Output Format
export interface OutputFormat {
    container: "raw";
    encoding: AudioEncoding;
    sample_rate: number;
}

// Type for Word Timestamps
export interface WordTimestamp {
    word: string[];
    start: number[];
    end: number[];
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

// Type for Publish Payload (WebSocket request body)
export interface PublishPayload {
    context_id: string;
    model_id: string;
    transcript: string;
    voice: {
        mode: VoiceMode;
        __experimental_controls?: {
            speed?: VoiceSpeed | number; // Custom speeds can be represented as a float
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

