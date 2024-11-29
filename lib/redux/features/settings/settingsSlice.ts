import { createSlice, PayloadAction } from '@reduxjs/toolkit';


interface SettingsState {
    submitOnEnter: boolean;
    aiPreferencesMain: string;
    aiPreferencesSecond: string;
    makeSmallTalk: boolean;
    quickAnswer: boolean;
    improveQuestions: boolean;
    matrixLevel: number;
    aiModel: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    stopSequence: string;
    systemMessage: string;

}

const initialState: SettingsState = {
    submitOnEnter: true,
    aiPreferencesMain: '',
    aiPreferencesSecond: '',
    makeSmallTalk: false,
    quickAnswer: false,
    improveQuestions: false,
    matrixLevel: 1,
    aiModel: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 150,
    topP: 1,
    frequencyPenalty: 0,
    stopSequence: '',
    systemMessage: 'You are a helpful assistant',

};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
            return {...state, ...action.payload};
        },
        resetSettings: () => initialState,
    },
});

export const {updateSettings, resetSettings} = settingsSlice.actions;

export default settingsSlice.reducer;
