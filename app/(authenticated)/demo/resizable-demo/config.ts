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
        title: 'Resizable Builder',
        path: 'resizable-builder',
        relative: true,
        description: 'An attempt to create a UI to show how you can structure the layouts.'
    },
    {
        title: 'Nested With Header Footer',
        path: 'nested-with-header-footer',
        relative: true,
        description: ''
    },
    {
        title: 'Nested Split',
        path: 'nested-split',
        relative: true,
        description: ''
    },
    {
        title: 'Vertical Split',
        path: 'vertical-split',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/demo/resizable-demo';
export const MODULE_NAME = 'Resizable Demo';
