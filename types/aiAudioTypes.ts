// AiAudioConfig
import {BaseModuleSchema} from "@/lib/redux/dynamic/moduleSchema";

export interface AiAudioConfig {
    model_id: string;
    voice: {
        mode: string;
        id: string;
        __experimental_controls: {
            speed: string;
            emotion: string[];
        };
    };
    transcript: string;
    defaultVoices: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    [key: string]: any;
}

// AiAudioUserPreferences
export interface AiAudioUserPreferences {
    audio: {
        voiceId: string;
        language: string;
        speed: string;
        emotion: string;
        microphone: boolean;
        speaker: boolean;
        wakeWord: string;
    };
    customVocab: Record<string, unknown>;
    [key: string]: any;
}

export interface AiVoice {
    id: string;
    name: string;
    description?: string;
    embedding?: number[];
    is_public?: boolean;
    user_id?: string;
    created_at?: string;
    language?: string;
}

export interface AudioFile {
    id: string;
    url: string;
    duration?: number;
    format?: string;
    size?: number;
    created_at?: string;
}

export interface transcripts {
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
}

export interface meetingNotes extends transcripts {
    meetingId: string;
    partNumber?: number;
    section?: string;
    [key: string]: any;
}

// AiAudioData
export interface AiAudioData {
    availableVoices: AiVoice[];
    customVoices: AiVoice[];
    voiceClones: AiVoice[];
    transcripts: transcripts[];
    meetingNotes: meetingNotes[];
    savedAudio: AudioFile[];
    userAudioFiles: AudioFile[];
    [key: string]: any;
}

const aiAudioInitialData: AiAudioData = {
    availableVoices: [],
    customVoices: [],
    voiceClones: [],
    transcripts: [],
    meetingNotes: [],
    savedAudio: [],
    userAudioFiles: [],
};

export type AiAudioSchema = BaseModuleSchema<AiAudioConfig, AiAudioUserPreferences, AiAudioData>;
