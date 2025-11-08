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

// Text-to-Speech preferences (Groq PlayAI TTS) - separate from Voice service
export type GroqTtsVoice = 
    | 'Arista-PlayAI'
    | 'Atlas-PlayAI'
    | 'Basil-PlayAI'
    | 'Briggs-PlayAI'
    | 'Calum-PlayAI'
    | 'Celeste-PlayAI'
    | 'Cheyenne-PlayAI'
    | 'Chip-PlayAI'
    | 'Cillian-PlayAI'
    | 'Deedee-PlayAI'
    | 'Fritz-PlayAI'
    | 'Gail-PlayAI'
    | 'Indigo-PlayAI'
    | 'Mamaw-PlayAI'
    | 'Mason-PlayAI'
    | 'Mikail-PlayAI'
    | 'Mitch-PlayAI'
    | 'Quinn-PlayAI'
    | 'Thunder-PlayAI';

export interface TextToSpeechPreferences {
    preferredVoice: GroqTtsVoice;
    autoPlay: boolean;
    processMarkdown: boolean;
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

export interface AiModelsPreferences {
    defaultModel: string;
    activeModels: string[];
    inactiveModels: string[];
    newModels: string[];
}

export interface SystemPreferences {
    viewedAnnouncements: string[]; // Array of announcement IDs that have been viewed
    feedbackFeatureViewCount: number; // Number of times user has seen the new feedback feature highlight
}

export type ThinkingMode = 'none' | 'simple' | 'deep';

export interface PromptsPreferences {
    showSettingsOnMainPage: boolean;
    defaultModel: string; // ID of the default model from active models
    defaultTemperature: number; // 0-2 in 0.01 increments
    alwaysIncludeInternalWebSearch: boolean;
    includeThinkingInAutoPrompts: ThinkingMode;
    submitOnEnter: boolean;
    autoClearResponsesInEditMode: boolean;
}

// Combine all module preferences into one interface
export interface UserPreferences {
    display: DisplayPreferences;
    prompts: PromptsPreferences;
    voice: VoicePreferences;
    textToSpeech: TextToSpeechPreferences;
    assistant: AssistantPreferences;
    email: EmailPreferences;
    videoConference: VideoConferencePreferences;
    photoEditing: PhotoEditingPreferences;
    imageGeneration: ImageGenerationPreferences;
    textGeneration: TextGenerationPreferences;
    coding: CodingPreferences;
    flashcard: FlashcardPreferences;
    playground: PlaygroundPreferences;
    aiModels: AiModelsPreferences;
    system: SystemPreferences;
}

// Add state interface for async operations
export interface UserPreferencesState extends UserPreferences {
    _meta: {
        isLoading: boolean;
        error: string | null;
        lastSaved: string | null;
        hasUnsavedChanges: boolean;
        loadedPreferences: UserPreferences | null; // Store original loaded state for reset
    };
}

// Helper function to ensure preferences have the proper structure
export const initializeUserPreferencesState = (preferences: Partial<UserPreferences> = {}, setAsLoaded: boolean = false): UserPreferencesState => {
    const defaultMeta = {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
        loadedPreferences: null as UserPreferences | null,
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
        prompts: {
            showSettingsOnMainPage: false,
            defaultModel: '548126f2-714a-4562-9001-0c31cbeea375', // GPT-4.1 Mini
            defaultTemperature: 1.0,
            alwaysIncludeInternalWebSearch: true,
            includeThinkingInAutoPrompts: 'none',
            submitOnEnter: true,
            autoClearResponsesInEditMode: true,
        },
        voice: {
            voice: '156fb8d2-335b-4950-9cb3-a2d33befec77',
            language: 'en',
            speed: 1,
            emotion: '',
            microphone: false,
            speaker: false,
            wakeWord: 'Hey Matrix',
        },
        textToSpeech: {
            preferredVoice: 'Cheyenne-PlayAI',
            autoPlay: false,
            processMarkdown: true,
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
        aiModels: {
            defaultModel: '548126f2-714a-4562-9001-0c31cbeea375', // GPT-4.1 Mini
            activeModels: [],
            inactiveModels: [],
            newModels: [],
        },
        system: {
            viewedAnnouncements: [],
            feedbackFeatureViewCount: 0,
        },
    };

    // Merge with defaults to ensure all properties exist
    const mergedPreferences: UserPreferences = {
        display: { ...defaultPreferences.display, ...preferences.display },
        prompts: { ...defaultPreferences.prompts, ...preferences.prompts },
        voice: { ...defaultPreferences.voice, ...preferences.voice },
        textToSpeech: { ...defaultPreferences.textToSpeech, ...preferences.textToSpeech },
        assistant: { ...defaultPreferences.assistant, ...preferences.assistant },
        email: { ...defaultPreferences.email, ...preferences.email },
        videoConference: { ...defaultPreferences.videoConference, ...preferences.videoConference },
        photoEditing: { ...defaultPreferences.photoEditing, ...preferences.photoEditing },
        imageGeneration: { ...defaultPreferences.imageGeneration, ...preferences.imageGeneration },
        textGeneration: { ...defaultPreferences.textGeneration, ...preferences.textGeneration },
        coding: { ...defaultPreferences.coding, ...preferences.coding },
        flashcard: { ...defaultPreferences.flashcard, ...preferences.flashcard },
        playground: { ...defaultPreferences.playground, ...preferences.playground },
        aiModels: { ...defaultPreferences.aiModels, ...preferences.aiModels },
        system: { ...defaultPreferences.system, ...preferences.system },
    };

    // If setAsLoaded is true, store the merged preferences as the loaded state
    if (setAsLoaded) {
        defaultMeta.loadedPreferences = { ...mergedPreferences };
    }

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
        resetToLoadedPreferences: (state) => {
            if (state._meta.loadedPreferences) {
                // Restore each module from loaded preferences
                state.display = { ...state._meta.loadedPreferences.display };
                state.prompts = { ...state._meta.loadedPreferences.prompts };
                state.voice = { ...state._meta.loadedPreferences.voice };
                state.textToSpeech = { ...state._meta.loadedPreferences.textToSpeech };
                state.assistant = { ...state._meta.loadedPreferences.assistant };
                state.email = { ...state._meta.loadedPreferences.email };
                state.videoConference = { ...state._meta.loadedPreferences.videoConference };
                state.photoEditing = { ...state._meta.loadedPreferences.photoEditing };
                state.imageGeneration = { ...state._meta.loadedPreferences.imageGeneration };
                state.textGeneration = { ...state._meta.loadedPreferences.textGeneration };
                state.coding = { ...state._meta.loadedPreferences.coding };
                state.flashcard = { ...state._meta.loadedPreferences.flashcard };
                state.playground = { ...state._meta.loadedPreferences.playground };
                state.aiModels = { ...state._meta.loadedPreferences.aiModels };
                state.system = { ...state._meta.loadedPreferences.system };
                state._meta.hasUnsavedChanges = false;
                state._meta.error = null;
            }
        },
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
                // Update loaded preferences to current state after successful save
                const { _meta, ...currentPreferences } = state;
                state._meta.loadedPreferences = { ...currentPreferences } as UserPreferences;
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
                // Update loaded preferences to current state after successful save
                const { _meta, ...currentPreferences } = state;
                state._meta.loadedPreferences = { ...currentPreferences } as UserPreferences;
            })
            .addCase(saveModulePreferencesToDatabase.rejected, (state, action) => {
                state._meta.isLoading = false;
                state._meta.error = action.payload as string;
            })
            // Load preferences
            .addCase(loadPreferencesFromDatabase.pending, (state) => {
                state._meta.isLoading = true;
                state._meta.error = null;
            })
            .addCase(loadPreferencesFromDatabase.fulfilled, (state, action) => {
                state._meta.isLoading = false;
                state._meta.error = null;
                // Load all preferences and store as loaded state
                const loadedPrefs = action.payload;
                state.display = { ...loadedPrefs.display };
                state.prompts = { ...loadedPrefs.prompts };
                state.voice = { ...loadedPrefs.voice };
                state.textToSpeech = { ...loadedPrefs.textToSpeech };
                state.assistant = { ...loadedPrefs.assistant };
                state.email = { ...loadedPrefs.email };
                state.videoConference = { ...loadedPrefs.videoConference };
                state.photoEditing = { ...loadedPrefs.photoEditing };
                state.imageGeneration = { ...loadedPrefs.imageGeneration };
                state.textGeneration = { ...loadedPrefs.textGeneration };
                state.coding = { ...loadedPrefs.coding };
                state.flashcard = { ...loadedPrefs.flashcard };
                state.playground = { ...loadedPrefs.playground };
                state.aiModels = { ...loadedPrefs.aiModels };
                state.system = { ...loadedPrefs.system };
                state._meta.loadedPreferences = { ...loadedPrefs };
                state._meta.hasUnsavedChanges = false;
            })
            .addCase(loadPreferencesFromDatabase.rejected, (state, action) => {
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
    resetToLoadedPreferences,
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

export const loadPreferencesFromDatabase = createAsyncThunk(
    'userPreferences/loadFromDatabase',
    async (_, { rejectWithValue }) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('user_preferences')
                .select('preferences')
                .eq('user_id', user.id)
                .single();

            if (error) {
                throw error;
            }

            return data.preferences as UserPreferences;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to load preferences');
        }
    }
);
