// lib/redux/moduleSchema.ts

import {AiAudioSchema} from "@/types/aiAudioTypes";
import {AiChatSchema} from "@/types/aiChatTypes";
import {ImageEditorSchema} from "@/types/imageEditorTypes";
export type ModuleName = 'aiAudio' | 'aiChat' | 'imageEditor';

export interface BaseModuleSchema<C, U, D> {
    moduleName: ModuleName;
    initiated: boolean;
    configs: C;
    userPreferences: U;
    data: D;
    loading: boolean;
    error: string | null;
    staleTime: number;
}

export type ModuleSchema = AiAudioSchema | AiChatSchema | ImageEditorSchema;


export const moduleSystemDefaults = {
    initiated: false,
    loading: false,
    error: null,
    staleTime: 600000,
};


export const moduleSchemas: Record<ModuleName, ModuleSchema> = {
    aiAudio: {
        moduleName: "aiAudio",
        initiated: moduleSystemDefaults.initiated,
        configs: {},
        userPreferences: {},
        data: {},
        loading: moduleSystemDefaults.loading,
        error: moduleSystemDefaults.error,
        staleTime: moduleSystemDefaults.staleTime,
    },
    aiChat: {
        moduleName: "aiChat",
        initiated: moduleSystemDefaults.initiated,
        configs: {},
        userPreferences: {},
        data: {},
        loading: moduleSystemDefaults.loading,
        error: moduleSystemDefaults.error,
        staleTime: moduleSystemDefaults.staleTime,
    },
    imageEditor: {
        moduleName: "imageEditor",
        initiated: moduleSystemDefaults.initiated,
        configs: {},
        userPreferences: {},
        data: {},
        loading: moduleSystemDefaults.loading,
        error: moduleSystemDefaults.error,
        staleTime: moduleSystemDefaults.staleTime,
    },
};