import {assistantMessages, userMessages} from "@/components/playground/next-playground/messages";

export type PlaygroundPreset = {
    id: string;
    name: string;
};


export const messagesDemo = [
    {
        role: "user",
        message: userMessages[0],
    },
    {
        role: "assistant",
        message: assistantMessages[0],
    },
    {
        role: "user",
        message: userMessages[1],
    },
    {
        role: "assistant",
        message: assistantMessages[1],
    },
];


export const presetsDemo: PlaygroundPreset[] = [
    {
        id: "1",
        name: "Preset 1",
    },
    {
        id: "2",
        name: "Preset 2",
    },
    {
        id: "3",
        name: "Preset 3",
    },
    {
        id: "4",
        name: "Preset 4",
    },
    {
        id: "5",
        name: "Preset 5",
    },
    {
        id: "6",
        name: "Preset 6",
    },
    {
        id: "7",
        name: "Preset 7",
    },
    {
        id: "8",
        name: "Preset 8",
    },
    {
        id: "9",
        name: "Preset 9",
    },
    {
        id: "10",
        name: "Preset 10",
    },
];

export const DEFAULT_MODELS_DEMO = [
    "gpt-4",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    "babbage-002",
    "davinci-002",
];

export const fineTuneModelsDemo = [
    "personal::gpt-3",
    "personal::gpt-3-16k",
    "personal::gpt-3-16k-2",
    "personal::gpt-3-16k-3",
    "personal::gpt-3-16k-4",
    "personal::gpt-3-16k-5",
];

export const ideasData = [
    {
        title: "Create a blog post about NextUI",
        description: "explain it in simple terms",
    },
    {
        title: "Give me 10 ideas for my next blog post",
        description: "include only the best ideas",
    },
    {
        title: "Compare NextUI with other UI libraries",
        description: "be as objective as possible",
    },
    {
        title: "Write a text message to my friend",
        description: "be polite and friendly",
    },
];
