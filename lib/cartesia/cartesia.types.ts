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
    SonicMultiLingualLatest = "sonic-2024-12-12",
    SonicTurbo = "sonic-turbo-2025-03-07",
    Sonic2 = "sonic-2-2025-03-07",
}

export interface TTSRequestBody {
    model_id: ModelId;
    transcript: string;
    voice: VoiceOptions;
    output_format: OutputFormat;
    language: Language;
    duration: number;
}



export type StreamRequest = {
    modelId: string;
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


export type Sentinel = null;
export type Chunk = string | Sentinel;
export type ConnectionEventData = {
    open: never;
    close: never;
};


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
