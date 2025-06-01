// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Backup Workflow',
        path: 'backup',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Claude 1 Workflow',
        path: 'claude-1',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Claude 2 Workflow',
        path: 'claude-2',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'First Workflow',
        path: 'first',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Grok 1 Workflow',
        path: 'grok-1',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Workflow Manager',
        path: 'workflow-manager',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Workflow Review',
        path: 'workflow-review',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Workflow Step Creation',
        path: 'workflow-step-creation',
        relative: true,
        description: 'Temporary page for testing workflow step creation'
    },
    {
        title: 'Workflow Step Creation Overlay Demo',
        path: 'workflow-step-creation/overlay-demo',
        relative: true,
        description: 'Temporary page for testing workflow step creation overlay'
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
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/workflows';
export const MODULE_NAME = 'Workflow Tests';
