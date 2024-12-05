// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'link-here',
        relative: true,
        description: ''
    },
    {
        title: 'Wake Word Debug',
        path: 'wake-word-debug',
        relative: true,
        description: ''
    },
    {
        title: 'Wake Word Test',
        path: 'wake-word-test',
        relative: true,
        description: ''
    },
    {
        title: 'Debate Assistant',
        path: 'debate-assistant',
        relative: true,
        description: ''
    },
    {
        title: 'Voice Assistant With Sidebar',
        path: 'voice-assistant-two',
        relative: true,
        description: ''
    },
    {
        title: 'Voice Assistant',
        path: 'voice-assistant',
        relative: true,
        description: ''
    },
    {
        title: 'Manage Voices',
        path: 'voice-manager',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/demo/voice';
export const MODULE_NAME = 'Voice Module';
