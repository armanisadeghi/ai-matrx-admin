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
        title: 'Async Sequential Create Any Two Entities',
        path: 'entity-json-builder/async-sequential-create',
        relative: true,
        description: ''
    },
    {
        title: 'Async Direct Create One Entity',
        path: 'entity-json-builder/async-direct-create',
        relative: true,
        description: ''
    },
    {
        title: 'Entity JSON Builder Test',
        path: 'entity-json-builder-test',
        relative: true,
        description: ''
    },
    {
        title: 'Relationship Testing With Fetch, Create and Delete',
        path: 'rel-with-fetch-test',
        relative: true,
        description: ''
    },
    {
        title: 'Original Test Fully Manual',
        path: 'original-manual',
        relative: true,
        description: ''
    },
    {
        title: 'Entity JSON Builder',
        path: 'entity-json-builder',
        relative: true,
        description: ''
    },
    {
        title: 'Metadata Test',
        path: 'metadata-test',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/relation-management';
export const MODULE_NAME = 'Relation Management';
