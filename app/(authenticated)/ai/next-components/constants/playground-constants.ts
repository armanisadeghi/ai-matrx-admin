// File: constants/playground-constants.ts

export type Preset = {
    id: string;
    name: string;
};

export const presets: Preset[] = [
    { id: "1", name: "Preset 1" },
    { id: "2", name: "Preset 2" },
    { id: "3", name: "Preset 3" },
    { id: "4", name: "Preset 4" },
    { id: "5", name: "Preset 5" },
    { id: "6", name: "Preset 6" },
    { id: "7", name: "Preset 7" },
    { id: "8", name: "Preset 8" },
    { id: "9", name: "Preset 9" },
    { id: "10", name: "Preset 10" },
];

export const DEFAULT_MODELS: string[] = [
    "gpt-4",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    "babbage-002",
    "davinci-002",
];

export const FINE_TUNE_MODELS: string[] = [
    "personal::gpt-3",
    "personal::gpt-3-16k",
    "personal::gpt-3-16k-2",
    "personal::gpt-3-16k-3",
    "personal::gpt-3-16k-4",
    "personal::gpt-3-16k-5",
];