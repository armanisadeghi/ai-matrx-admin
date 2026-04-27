// lib/redux/dynamic/baseModuleSchema.ts
// Leaf module — no imports from features or types directories.
// Extracted here to break the moduleSchema ↔ aiAudioTypes/aiChatTypes/imageEditorTypes cycle.

export type ModuleName = 'aiAudio' | 'aiChat' | 'imageEditor' | 'systemComponents';

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
