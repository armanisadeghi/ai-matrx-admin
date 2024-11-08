// app/(authenticated)/tests/table-test/config.ts

import { ModulePage } from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Custom Table',
        path: 'custom-table',
        relative: true,
        description: 'Original Custom Table implementation'
    },
    {
        title: 'Entity Table Test (Unknown Version)',
        path: 'entity-table-test',
        relative: true,
        description: 'Not sure which one this is'
    },
    {
        title: 'Entity Data Table All in One Original',
        path: 'entity-data-table',
        relative: true,
        description: 'Fully Functional All-In-One'
    },
    {
        title: 'Matrx Data Table',
        path: 'matrx-data-table',
        relative: true,
        description: 'Same as all-in-one, but broken into 2 parts'
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
