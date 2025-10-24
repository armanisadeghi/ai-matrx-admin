// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Service Demo: Ref Manager & Callback Manager',
        path: 'services',
        relative: true,
        description: ''
    },
    {
        title: 'Resizable Demo',
        path: 'resizable-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Persistance Demo',
        path: 'persistance-demo',
        relative: true,
        description: ''
    },
    {
        title: 'PDF Quiz',
        path: 'pdf-quiz',
        relative: true,
        description: ''
    },
    {
        title: 'News Page',
        path: 'news',
        relative: true,
        description: ''
    },
    {
        title: 'Many to Many UI',
        path: 'many-to-many-ui',
        relative: true,
        description: ''
    },
    {
        title: 'Fetch React React Code Display Page',
        path: 'fetch-react',
        relative: true,
        description: ''
    },
    {
        title: 'Component Demo',
        path: 'component-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Code Generator',
        path: 'code-generator',
        relative: true,
        description: ''
    },
    {
        title: 'Chatbot Customizer',
        path: 'chatbot-customizer',
        relative: true,
        description: ''
    },
    {
        title: 'Card Demo',
        path: 'card-demo',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/demo';
export const MODULE_NAME = 'Demo';
