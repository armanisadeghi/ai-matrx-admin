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
        title: 'Message and Conversation Demo',
        path: 'create-update-record-test/message-convo-demo',
        relative: true,
        description: 'Test the combined hook for Conversation and Message: useConversationMessages hook'
    },
    {
        title: 'Message Demo',
        path: 'create-update-record-test/message-demo',
        relative: true,
        description: 'Test the useMessage hook'
    },
    {
        title: 'Create Update Record Test',
        path: 'create-update-record-test',
        relative: true,
        description: 'Test the createUpdateRecord hook'
    },
    {
        title: 'Basic CRUD',
        path: 'basic-crud',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/crud-operations';
export const MODULE_NAME = 'CRUD Operations';
