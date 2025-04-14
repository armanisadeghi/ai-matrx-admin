import { AudioEncoding, Language, ModelId, OutputContainer } from "./cartesia.types";

export type Emotion = "anger" | "sadness" | "positivity" | "curiosity" | "surprise";

export const EMOTIONS = {
  ANGER: {
    value: "anger" as Emotion,
    displayName: "Emotion: Anger",
  },
  SADNESS: {
    value: "sadness" as Emotion,
    displayName: "Emotion: Sadness",
  },
  POSITIVITY: {
    value: "positivity" as Emotion,
    displayName: "Emotion: Positivity",
  },
  CURIOSITY: {
    value: "curiosity" as Emotion,
    displayName: "Emotion: Curiosity",
  },
  SURPRISE: {
    value: "surprise" as Emotion,
    displayName: "Emotion: Surprise",
  },
} as const;

export const EMOTION_OPTIONS = Object.values(EMOTIONS);


export type Intensity = "lowest" | "low" | "high" | "highest" | "";

export const INTENSITIES = {
  LOWEST: {
    value: "lowest" as Intensity,
    displayName: "Intensity: Lowest",
  },
  LOW: {
    value: "low" as Intensity,
    displayName: "Intensity: Low",
  },
  MEDIUM: {
    value: "" as Intensity,
    displayName: "Intensity: Medium",
  },
  HIGH: {
    value: "high" as Intensity,
    displayName: "Intensity: High",
  },
  HIGHEST: {
    value: "highest" as Intensity,
    displayName: "Intensity: Highest",
  },
} as const;

export const INTENSITY_OPTIONS = Object.values(INTENSITIES);


export const VOICE_SPEEDS = {
    SLOWEST: {
      value: "slowest" as "slowest",
      displayName: "Speed: Slowest",
    },
    SLOW: {
      value: "slow" as "slow",
      displayName: "Speed: Slow",
    },
    NORMAL: {
      value: "normal" as "normal",
      displayName: "Speed: Normal",
    },
    FAST: {
      value: "fast" as "fast",
      displayName: "Speed: Fast",
    },
    FASTEST: {
      value: "fastest" as "fastest",
      displayName: "Speed: Fastest",
    },
  } as const;
  
  export const VOICE_SPEED_OPTIONS = Object.values(VOICE_SPEEDS);


  export const AUDIO_ENCODINGS = {
    PCM_S16LE: {
      value: "pcm_s16le" as AudioEncoding,
      displayName: "Encoding: PCM 16-bit Signed LE",
    },
    PCM_F32LE: {
      value: "pcm_f32le" as AudioEncoding,
      displayName: "Encoding: PCM 32-bit Float LE",
    },
    PCM_MULAW: {
      value: "pcm_mulaw" as AudioEncoding,
      displayName: "Encoding: PCM μ-law",
    },
    PCM_ALAW: {
      value: "pcm_alaw" as AudioEncoding,
      displayName: "Encoding: PCM A-law",
    },
  } as const;
  
  export const AUDIO_ENCODING_OPTIONS = Object.values(AUDIO_ENCODINGS);


  export const LANGUAGES = {
    EN: {
      value: "en" as Language,
      displayName: "English",
    },
    DE: {
      value: "de" as Language,
      displayName: "German",
    },
    ES: {
      value: "es" as Language,
      displayName: "Spanish",
    },
    FR: {
      value: "fr" as Language,
      displayName: "French",
    },
    JA: {
      value: "ja" as Language,
      displayName: "Japanese",
    },
    PT: {
      value: "pt" as Language,
      displayName: "Portuguese",
    },
    ZH: {
      value: "zh" as Language,
      displayName: "Chinese",
    },
    HI: {
      value: "hi" as Language,
      displayName: "Hindi",
    },
    IT: {
      value: "it" as Language,
      displayName: "Italian",
    },
    KO: {
      value: "ko" as Language,
      displayName: "Korean",
    },
    NL: {
      value: "nl" as Language,
      displayName: "Dutch",
    },
    PL: {
      value: "pl" as Language,
      displayName: "Polish",
    },
    RU: {
      value: "ru" as Language,
      displayName: "Russian",
    },
    SV: {
      value: "sv" as Language,
      displayName: "Swedish",
    },
    TR: {
      value: "tr" as Language,
      displayName: "Turkish",
    },
  } as const;
  
  export const LANGUAGE_OPTIONS = Object.values(LANGUAGES);


  export const OUTPUT_CONTAINERS = {
    RAW: {
      value: "raw" as OutputContainer,
      displayName: "Output: Raw",
    },
    MP3: {
      value: "mp3" as OutputContainer,
      displayName: "Output: MP3",
    },
    WAVE: {
      value: "wave" as OutputContainer,
      displayName: "Output: WAVE",
    },
  } as const;
  
  export const OUTPUT_CONTAINER_OPTIONS = Object.values(OUTPUT_CONTAINERS);


  export const MODEL_IDS = {
    SONIC_ENGLISH: {
      value: "sonic-english" as ModelId,
      displayName: "Sonic English",
    },
    SONIC_MULTILINGUAL: {
      value: "sonic-multilingual" as ModelId,
      displayName: "Sonic Multilingual",
    },
    SONIC_MULTILINGUAL_LATEST: {
      value: "sonic-2024-12-12" as ModelId,
      displayName: "Sonic Multilingual Latest",
    },
    SONIC_TURBO: {
      value: "sonic-turbo-2025-03-07" as ModelId,
      displayName: "Sonic Turbo",
    },
    SONIC_2: {
      value: "sonic-2-2025-03-07" as ModelId,
      displayName: "Sonic 2",
    },
  } as const;
  
  export const MODEL_ID_OPTIONS = Object.values(MODEL_IDS);