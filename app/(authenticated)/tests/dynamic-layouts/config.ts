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
        title: '12x12 Grid Display',
        path: 'grid-system-12/grid-display',
        relative: true,
        description: ''
    },
    {
        title: '12x12 Grid System',
        path: 'grid-system-12',
        relative: true,
        description: 'Trying Concept with 12 columns and 12 rows.'
    },
    {
        title: 'Email App Demo In Grid',
        path: 'grid-demo/email-app-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Grid Concept Demo',
        path: 'grid-demo',
        relative: true,
        description: 'This turned out to be the best concept and is definitely what we should use.'
    },
    {
        title: 'Interactive Layout Demo With Light/Dark',
        path: 'interactive-light-dark',
        relative: true,
        description: ''
    },
    {
        title: 'Interactive Layout Demo',
        path: 'interactive-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Random Layout Options',
        path: 'random-layouts',
        relative: true,
        description: ''
    },
    {
        title: 'Basic Layout Options',
        path: 'basic-layout-options',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/dynamic-layouts';
export const MODULE_NAME = 'Dynamic Layout Tests';
