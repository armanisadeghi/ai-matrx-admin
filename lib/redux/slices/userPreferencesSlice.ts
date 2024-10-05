import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {AIProvider} from "@/lib/ai/aiChat.types";

// Define types for each module's preferences
interface DisplayPreferences {
    darkMode: boolean;
    theme: string;
    dashboardLayout: string;
    sidebarLayout: string;
    headerLayout: string;
    windowMode: string;
}

interface VoicePreferences {
    voice: string;
    language: string;
    speed: number;
    emotion: string;
    microphone: boolean;
    speaker: boolean;
    wakeWord: string;
}

interface AssistantPreferences {
    alwaysActive: boolean;
    alwaysWatching: boolean;
    useAudio: boolean;
    name: string;
    isPersonal: boolean;
    memoryLevel: number;
    preferredProvider: AIProvider;
    preferredModel: string;

}

// Suggested preferences for email management (you can adjust or remove as needed)
interface EmailPreferences {
    primaryEmail: string;
    notificationsEnabled: boolean;
    autoReply: boolean;
    signature: string;
    preferredEmailClient: string;
}

// Suggested preferences for video conferencing (you can add or adjust fields)
interface VideoConferencePreferences {
    background: string;
    filter: string;
    defaultCamera: string;
    defaultMicrophone: string;
    defaultSpeaker: string;
    defaultMeetingType: string;
    defaultLayout: string;
    defaultNotesType: string;
    AiActivityLevel: string;
}

// Suggested preferences for photo editing (add your own fields)
interface PhotoEditingPreferences {
    defaultFilter: string;
    autoEnhance: boolean;
    resolution: string;
    defaultAspectRatio: string;
    watermarkEnabled: boolean;
}


interface ImageGenerationPreferences {
    defaultModel: string;
    resolution: string;
    style: string;
    useAiEnhancements: boolean;
    colorPalette: string;
}


interface TextGenerationPreferences {
    defaultModel: string;
    tone: string;
    creativityLevel: string;
    language: string;
    plagiarismCheckEnabled: boolean;
}

// Preferences for coding settings
interface CodingPreferences {
    preferredLanguage: string;
    preferredTheme: string;
    gitIntegration: boolean;
    instancePreference: string;
    codeCompletion: boolean;
    codeAnalysis: boolean;
    codeFormatting: boolean;
    aiActivityLevel: string;
    voiceAssistance: boolean;
}

interface FlashcardPreferences {
    fontSize: number;
    educationLevel: string;
    flashcardDifficultyAdjustment: number;
    aiDifficultyAdjustment: number;
    language: string;
    defaultFlashcardMode: string;
    targetScore: number;
    primaryAudioVoice: string;
    primaryTutorPersona: string;
}



// Combine all module preferences into one interface
interface UserPreferences {
    display: DisplayPreferences;
    voice: VoicePreferences;
    assistant: AssistantPreferences;
    email: EmailPreferences;
    videoConference: VideoConferencePreferences;
    photoEditing: PhotoEditingPreferences;
    imageGeneration: ImageGenerationPreferences;
    textGeneration: TextGenerationPreferences;
    coding: CodingPreferences;
    flashcard: FlashcardPreferences;
}

// Define the initial state
const initialState: UserPreferences = {
    display: {
        darkMode: false,
        theme: 'default',
        dashboardLayout: 'default',
        sidebarLayout: 'default',
        headerLayout: 'default',
        windowMode: 'default',
    },
    voice: {
        voice: '',
        language: '',
        speed: 1,
        emotion: '',
        microphone: false,
        speaker: false,
        wakeWord: 'Hey Matrix',
    },
    flashcard: {
        fontSize: 16,
        educationLevel: 'highSchool',
        flashcardDifficultyAdjustment: 5,
        aiDifficultyAdjustment: 5,
        language: 'en',
        defaultFlashcardMode: `selfStudy`,
        targetScore: 80,
        primaryAudioVoice: 'default',
        primaryTutorPersona: 'default',
    },
    assistant: {
        alwaysActive: false,
        alwaysWatching: false,
        useAudio: false,
        name: 'Assistant',
        isPersonal: false,
        memoryLevel: 0,
        preferredProvider: 'default',
        preferredModel: 'default',
    },
    email: {
        primaryEmail: '',
        notificationsEnabled: true,
        autoReply: false,
        signature: '',
        preferredEmailClient: 'default',
    },
    videoConference: {
        background: 'default',
        filter: 'default',
        defaultCamera: 'default',
        defaultMicrophone: 'default',
        defaultSpeaker: 'default',
        defaultMeetingType: 'default',
        defaultLayout: 'default',
        defaultNotesType: 'default',
        AiActivityLevel: 'default',
    },
    photoEditing: {
        defaultFilter: 'none',
        autoEnhance: false,
        resolution: '1080p',
        defaultAspectRatio: '16:9',
        watermarkEnabled: false,
    },
    imageGeneration: {
        defaultModel: 'standard',
        resolution: '1080p',
        style: 'realistic',
        useAiEnhancements: true,
        colorPalette: 'vibrant',
    },
    textGeneration: {
        defaultModel: 'GPT-4o',
        tone: 'neutral',
        creativityLevel: 'medium',
        language: 'en',
        plagiarismCheckEnabled: true,
    },
    coding: {
        preferredLanguage: 'javascript',
        preferredTheme: 'dark',
        gitIntegration: true,
        instancePreference: 'local',
        codeCompletion: true,
        codeAnalysis: true,
        codeFormatting: true,
        aiActivityLevel: 'medium',
        voiceAssistance: false,
    },
};

const userPreferencesSlice = createSlice({
    name: 'userPreferences',
    initialState,
    reducers: {
        setPreference: (
            state,
            action: PayloadAction<{
                module: keyof UserPreferences;
                preference: string;
                value: any;
            }>
        ) => {
            const { module, preference, value } = action.payload;
            (state[module] as any)[preference] = value;
        },
        setModulePreferences: <T extends keyof UserPreferences>(
            state,
            action: PayloadAction<{
                module: T;
                preferences: Partial<UserPreferences[T]>;
            }>
        ) => {
            const { module, preferences } = action.payload;
            state[module] = { ...state[module], ...preferences } as UserPreferences[T];
        },
        resetModulePreferences: <T extends keyof UserPreferences>(
            state,
            action: PayloadAction<T>
        ) => {
            const module = action.payload;
            state[module] = initialState[module] as UserPreferences[T];
        },
        resetAllPreferences: () => initialState,
    },
});

export const {
    setPreference,
    setModulePreferences,
    resetModulePreferences,
    resetAllPreferences,
} = userPreferencesSlice.actions;

export default userPreferencesSlice.reducer;
