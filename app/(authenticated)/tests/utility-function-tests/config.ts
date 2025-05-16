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
        title: 'Applet Function Registry Demo',
        path: 'function-registry-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Create Table Templates',
        path: 'create-table-templates',
        relative: true,
        description: ''
    },
    {
        title: 'Function Button Demo',
        path: 'function-button-demo',
        relative: true,
        description: 'Demo of a generic button that can execute any registered function'
    },
    {
        title: 'Smart Function Executor Demo',
        path: 'smart-executor-demo',
        relative: true,
        description: 'Demo of the SmartFunctionExecutor that combines functions with specialized result displays'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/utility-function-tests';
export const MODULE_NAME = 'Utility Function Tests';
