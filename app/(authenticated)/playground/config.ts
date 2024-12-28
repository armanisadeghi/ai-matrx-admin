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
        title: 'Matrx Playground Attempting Text Integration',
        path: 'matrx-playground-concept-four',
        relative: true,
        description: ''
    },
    {
        title: 'Matrx Playground Concept 3',
        path: 'matrx-playground-concept-three',
        relative: true,
        description: ''
    },
    {
        title: 'Matrx Playground Concept 2',
        path: 'matrx-playground-concept-two',
        relative: true,
        description: ''
    },
    {
        title: 'Matrx Playground Concept 1',
        path: 'matrx-playground-concept',
        relative: true,
        description: ''
    },
    {
        title: 'Not Implemented',
        path: 'next-ui-playground',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/playground';
export const MODULE_NAME = 'Playground Module';
