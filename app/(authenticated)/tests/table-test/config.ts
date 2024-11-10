// app/(authenticated)/tests/table-test/config.ts

import { ModulePage } from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Advanced Data Table',
        path: 'advanced-data-table',
        relative: true,
        description: 'New Advanced Table that uses the new useAdvancedDataTable hook and integrates new action, and cell renderers logic.'
    },
    {
        title: 'Matrx Data Table',
        path: 'matrx-data-table',
        relative: true,
        description: 'Same as all-in-one, but broken into 2 parts'
    },
    {
        title: 'Entity Data Table All in One Original',
        path: 'entity-data-table',
        relative: true,
        description: 'Fully Functional All-In-One'
    },
    {
        title: 'Entity Table Test',
        path: 'entity-table-test',
        relative: true,
        description: 'Hardcoded Page.tsx for specific entity (Registered Function). Uses ModernTable'
    },
    {
        title: 'Custom Table',
        path: 'custom-table',
        relative: true,
        description: 'Original Custom Table implementation'
    },
    {
        title: 'Basic Reg Func Simple',
        path: 'reg-func-simple',
        relative: true,
        description: 'Old Basic Reg Func Simple Table. Might be the one who started this entire mess!'
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
    }
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/table-test';
export const MODULE_NAME = 'Table Test Module';
