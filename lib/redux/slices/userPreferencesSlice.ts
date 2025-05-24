import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AIProvider } from '@/lib/ai/aiChat.types';
import { MatrxRecordId } from '@/types';
import { createClient } from '@/utils/supabase/client';

// Define types for each module's preferences
export interface DisplayPreferences {
    darkMode: boolean;
    theme: string;
    dashboardLayout: string;
    sidebarLayout: string;
    headerLayout: string;
    windowMode: string;
}

export interface VoicePreferences {
    voice: string;
    language: string;
    speed: number;
    emotion: string;
    microphone: boolean;
    speaker: boolean;
    wakeWord: string;
}

export interface AssistantPreferences {
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
export interface EmailPreferences {
    primaryEmail: string;
    notificationsEnabled: boolean;
    autoReply: boolean;
    signature: string;
    preferredEmailClient: string;
}

// Suggested preferences for video conferencing (you can add or adjust fields)
export interface VideoConferencePreferences {
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
export interface PhotoEditingPreferences {
    defaultFilter: string;
    autoEnhance: boolean;
    resolution: string;
    defaultAspectRatio: string;
    watermarkEnabled: boolean;
}

export interface ImageGenerationPreferences {
    defaultModel: string;
    resolution: string;
    style: string;
    useAiEnhancements: boolean;
    colorPalette: string;
}

export interface TextGenerationPreferences {
    defaultModel: string;
    tone: string;
    creativityLevel: string;
    language: string;
    plagiarismCheckEnabled: boolean;
}

// Preferences for coding settings
export interface CodingPreferences {
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

export interface FlashcardPreferences {
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

export interface PlaygroundPreferences {
    lastRecipeId: MatrxRecordId;
    preferredProvider: MatrxRecordId;
    preferredModel: MatrxRecordId;
    preferredEndpoint: MatrxRecordId;
}

// Combine all module preferences into one interface
export interface UserPreferences {
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
    playground: PlaygroundPreferences;
}

// Add state interface for async operations
export interface UserPreferencesState extends UserPreferences {
    _meta: {
        isLoading: boolean;
        error: string | null;
        lastSaved: string | null;
        hasUnsavedChanges: boolean;
    };
}

// Helper function to ensure preferences have the proper structure
export const initializeUserPreferencesState = (preferences: Partial<UserPreferences> = {}): UserPreferencesState => {
    const defaultMeta = {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
    };

    const defaultPreferences: UserPreferences = {
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
            defaultFlashcardMode: 'selfStudy',
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
        playground: {
            lastRecipeId: '',
            preferredProvider: '',
            preferredModel: '',
            preferredEndpoint: '',
        },
    };

    // Merge with defaults to ensure all properties exist
    const mergedPreferences: UserPreferences = {
        display: { ...defaultPreferences.display, ...preferences.display },
        voice: { ...defaultPreferences.voice, ...preferences.voice },
        assistant: { ...defaultPreferences.assistant, ...preferences.assistant },
        email: { ...defaultPreferences.email, ...preferences.email },
        videoConference: { ...defaultPreferences.videoConference, ...preferences.videoConference },
        photoEditing: { ...defaultPreferences.photoEditing, ...preferences.photoEditing },
        imageGeneration: { ...defaultPreferences.imageGeneration, ...preferences.imageGeneration },
        textGeneration: { ...defaultPreferences.textGeneration, ...preferences.textGeneration },
        coding: { ...defaultPreferences.coding, ...preferences.coding },
        flashcard: { ...defaultPreferences.flashcard, ...preferences.flashcard },
        playground: { ...defaultPreferences.playground, ...preferences.playground },
    };

    return {
        ...mergedPreferences,
        _meta: defaultMeta,
    };
};

const userPreferencesSlice = createSlice({
    name: 'userPreferences',
    initialState: initializeUserPreferencesState(),
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
            state._meta.hasUnsavedChanges = true;
            state._meta.error = null;
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
            state._meta.hasUnsavedChanges = true;
            state._meta.error = null;
        },
        resetModulePreferences: <T extends keyof UserPreferences>(state, action: PayloadAction<T>) => {
            const module = action.payload;
            state[module] = initializeUserPreferencesState()[module] as UserPreferences[T];
            state._meta.hasUnsavedChanges = true;
            state._meta.error = null;
        },
        resetAllPreferences: () => initializeUserPreferencesState(),
        clearUnsavedChanges: (state) => {
            state._meta.hasUnsavedChanges = false;
        },
        clearError: (state) => {
            state._meta.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Save all preferences
            .addCase(savePreferencesToDatabase.pending, (state) => {
                state._meta.isLoading = true;
                state._meta.error = null;
            })
            .addCase(savePreferencesToDatabase.fulfilled, (state, action) => {
                state._meta.isLoading = false;
                state._meta.lastSaved = action.payload.savedAt;
                state._meta.hasUnsavedChanges = false;
                state._meta.error = null;
            })
            .addCase(savePreferencesToDatabase.rejected, (state, action) => {
                state._meta.isLoading = false;
                state._meta.error = action.payload as string;
            })
            // Save module preferences
            .addCase(saveModulePreferencesToDatabase.pending, (state) => {
                state._meta.isLoading = true;
                state._meta.error = null;
            })
            .addCase(saveModulePreferencesToDatabase.fulfilled, (state, action) => {
                state._meta.isLoading = false;
                state._meta.lastSaved = action.payload.savedAt;
                state._meta.hasUnsavedChanges = false;
                state._meta.error = null;
            })
            .addCase(saveModulePreferencesToDatabase.rejected, (state, action) => {
                state._meta.isLoading = false;
                state._meta.error = action.payload as string;
            });
    },
});

export const { 
    setPreference, 
    setModulePreferences, 
    resetModulePreferences, 
    resetAllPreferences,
    clearUnsavedChanges,
    clearError 
} = userPreferencesSlice.actions;

export default userPreferencesSlice.reducer;

// Async thunks for Supabase operations
export const savePreferencesToDatabase = createAsyncThunk(
    'userPreferences/saveToDatabase',
    async (preferences: UserPreferences, { rejectWithValue }) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    preferences: preferences,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                throw error;
            }

            return { savedAt: new Date().toISOString() };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to save preferences');
        }
    }
);

export const saveModulePreferencesToDatabase = createAsyncThunk(
    'userPreferences/saveModuleToDatabase',
    async ({ module, preferences }: { module: keyof UserPreferences; preferences: Partial<UserPreferences[keyof UserPreferences]> }, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { userPreferences: UserPreferencesState };
            const currentPreferences = { ...state.userPreferences };
            
            // Remove meta from current preferences
            const { _meta, ...preferencesWithoutMeta } = currentPreferences;
            
            // Update the specific module
            const updatedPreferences = {
                ...preferencesWithoutMeta,
                [module]: { ...currentPreferences[module], ...preferences }
            };

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    preferences: updatedPreferences,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                throw error;
            }

            return { savedAt: new Date().toISOString() };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to save preferences');
        }
    }
);

