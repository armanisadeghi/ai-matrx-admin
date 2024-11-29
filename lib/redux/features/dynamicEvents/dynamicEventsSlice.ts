// redux/features/dynamicEvents/dynamicEventsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DynamicEvent } from './types';

interface DynamicEventsState {
    events: Record<string, DynamicEvent>;
    requestEvent: string;
    requestTask: string;
    requestStream: boolean;
    requestEventOptions: string[];
    requestTaskOptions: string[];
}

const initialState: DynamicEventsState = {
    events: {},
    requestEvent: '',
    requestTask: '',
    requestStream: true,
    requestEventOptions: [
        'simple_recipe',
        'full_recipe',
        'scrape',
        'transcription',
        'text_processing',
        'google_cloud',
        'workflow',
        'functions',
        'ai_prog',
        'video_processing',
        'dynamic_event_completed',
    ],
    requestTaskOptions: [
        'run_recipe',
        'validate_recipe',
        'get_recipe_brokers',
        'edit_recipe',
        'add_recipe',
        'scrape_one',
        'scrape_many',
        'scrape_keyword',
        'scrape_site',
        'transcribe',
        'audio_to_task',
        'audio_to_presentation',
        'online_video_to_text',
        'video_to_blog',
        'video_to_presentation',
        'pdf_to_text',
        'validate_workflow',
        'run_workflow',
        'validate_function',
        'run_function',
        'compile_workflow',
        'compile_recipe',
    ],
};

const dynamicEventsSlice = createSlice({
    name: 'dynamicEvents',
    initialState,
    reducers: {
        setDynamicEvent: (state, action: PayloadAction<DynamicEvent>) => {
            state.events[action.payload.eventName] = action.payload;
        },
        updateDynamicEventStatus: (state, action: PayloadAction<{ eventName: string; status: DynamicEvent['status'] }>) => {
            if (state.events[action.payload.eventName]) {
                state.events[action.payload.eventName].status = action.payload.status;
            }
        },
        updateDynamicEventStream: (state, action: PayloadAction<{ eventName: string; textStream: string }>) => {
            if (state.events[action.payload.eventName]) {
                state.events[action.payload.eventName].textStream += action.payload.textStream;
            }
        },
        removeDynamicEvent: (state, action: PayloadAction<string>) => {
            delete state.events[action.payload];
        },
        setRequestEvent: (state, action: PayloadAction<string>) => {
            state.requestEvent = action.payload;
        },
        setRequestTask: (state, action: PayloadAction<string>) => {
            state.requestTask = action.payload;
        },
        setRequestStream: (state, action: PayloadAction<boolean>) => {
            state.requestStream = action.payload;
        },
    },
});

export const {
    setDynamicEvent,
    updateDynamicEventStatus,
    updateDynamicEventStream,
    removeDynamicEvent,
    setRequestEvent,
    setRequestTask,
    setRequestStream,
} = dynamicEventsSlice.actions;

export default dynamicEventsSlice.reducer;
