// Enum for Voice Modes
enum VoiceMode {
    ID = "id",
    EMBEDDING = "embedding",
}

// Enum for Voice Speeds
enum VoiceSpeed {
    SLOWEST = "slowest",
    SLOW = "slow",
    NORMAL = "normal",
    FAST = "fast",
    FASTEST = "fastest",
    CUSTOM = "double", // Representing double as a string for specific values
}

// Enum for Audio Encodings
enum AudioEncoding {
    PCM_S16LE = "pcm_s16le",
    PCM_F32LE = "pcm_f32le",
    PCM_MULAW = "pcm_mulaw",
    PCM_ALAW = "pcm_alaw",
}

// Enum for Languages
enum Language {
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

// Type for Emotion Levels
type EmotionLevel = string; // Define based on your needs

// Type for Output Format
interface OutputFormat {
    container: "raw";
    encoding: AudioEncoding;
    sample_rate: number;
}

// Type for Word Timestamps
interface WordTimestamp {
    word: string[];
    start: number[];
    end: number[];
}

// Type for WebSocket Response
interface WebSocketResponse {
    type?: string;
    done?: boolean;
    status_code?: number;
    step_time?: number;
    context_id?: string;
    data?: string;
    word_timestamps?: WordTimestamp;
}

// Type for Publish Payload
interface PublishPayload {
    context_id: string;
    model_id: string;
    transcript: string;
    voice: {
        mode: VoiceMode;
        __experimental_controls?: {
            speed?: VoiceSpeed;
            emotion?: EmotionLevel[];
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

