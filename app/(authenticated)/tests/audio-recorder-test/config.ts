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
        title: 'Audio Store Tester',
        path: 'audio-store-tester',
        relative: true,
        description: 'Test audio store functionality'
    },
    {
        title: 'Recording Management',
        path: 'recording-management',
        relative: true,
        description: 'Test recording management features'
    },
    {
        title: 'Recording Management Combined',
        path: 'recording-management/combined-page',
        relative: true,
        description: 'Combined recording management test page'
    },
    {
        title: 'Test Five with Hook',
        path: 'test-five-with-hook',
        relative: true,
        description: 'Test five implementation with custom hook'
    },
    {
        title: 'Test Page Four',
        path: 'test-page-four',
        relative: true,
        description: 'Fourth test page implementation'
    },
    {
        title: 'Use Recorder Tester',
        path: 'use-recorder-tester',
        relative: true,
        description: 'Test useRecorder hook implementation'
    },
    {
        title: 'Test Page Three',
        path: 'test-page-three',
        relative: true,
        description: 'Third test page implementation'
    },
    {
        title: 'Full Test',
        path: 'full-test',
        relative: true,
        description: 'Complete audio recorder test implementation'
    }
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/audio-recorder-test';
export const MODULE_NAME = 'Audio Recorder Tests';
