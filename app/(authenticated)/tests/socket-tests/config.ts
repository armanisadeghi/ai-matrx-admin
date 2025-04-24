// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Redux Socket Form Test',
        path: 'redux-form-test',
        relative: true,
        description: ''
    },
    {
        title: 'Connection Test',
        path: 'connection-test',
        relative: true,
        description: ''
    },
    {
        title: 'Task Field Demo',
        path: 'task-field-demo',
        relative: true,
        description: 'This uses fields which are directly connected to the socket schema and redux.'
    },
    {
        title: 'Original Full Redux Test',
        path: 'full-redux',
        relative: true,
        description: 'This has now been replaced by the Task Field Demo.'
    },
    {
        title: 'Very Simple Chat Socket Test',
        path: 'chat-socket-test',
        relative: true,
        description: ''
    },
    {
        title: 'Better Structured Dynamic Task Builder',
        path: 'test-five',
        relative: true,
        description: 'This one is designed to allow us to dynamically build any socket task and test it, without frontend changes.'
    },
    {
        title: 'Modular Socket IO Recipe Tester',
        path: 'modular-recipe-socket',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/socket-tests';
export const MODULE_NAME = 'Socket IO Tests';
