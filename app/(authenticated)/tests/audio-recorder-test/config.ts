// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Initial Test',
        path: 'initial',
        relative: true,
        description: 'Initial audio recorder test'
    },
    {
        title: 'Recording Management',
        path: 'recording-management',
        relative: true,
        description: 'Test recording management features'
    },
    {
        title: 'Recording Management Combined',
        path: 'combined-page',
        relative: true,
        description: 'Combined recording management test page'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/audio-recorder-test';
export const MODULE_NAME = 'Audio Recorder Tests';
