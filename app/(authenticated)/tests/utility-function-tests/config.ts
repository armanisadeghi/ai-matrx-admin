// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: '📚 System Documentation',
        path: 'documentation',
        relative: true,
        description: 'Comprehensive system analysis, guides, and development roadmap'
    },
    {
        title: 'Applet Function Registry Demo',
        path: 'function-registry-demo',
        relative: true,
        description: 'Browse and execute registered functions, see pre-built applets in action'
    },
    {
        title: 'Function Button Demo',
        path: 'function-button-demo',
        relative: true,
        description: 'Test individual functions with custom JSON input data'
    },
    {
        title: 'Smart Function Executor Demo',
        path: 'smart-executor-demo',
        relative: true,
        description: 'Specialized result display components for different function types'
    },
    {
        title: 'Create Table Templates',
        path: 'create-table-templates',
        relative: true,
        description: 'Real-world example: Create database tables from templates with flashcard data import'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/utility-function-tests';
export const MODULE_NAME = 'Utility Function Tests';
