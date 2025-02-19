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
    {
        title: 'Socket IO Test Three',
        path: 'test-three',
        relative: true,
        description: ''
    },
    {
        title: 'Socket IO Test Two',
        path: 'test-two',
        relative: true,
        description: ''
    },
    {
        title: 'Initial Socket IO Test',
        path: 'test-one',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/socket-tests';
export const MODULE_NAME = 'Socket IO Tests';
