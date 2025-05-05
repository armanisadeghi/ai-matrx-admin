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
        title: 'SQL Functions',
        path: 'database/sql-functions',
        relative: true,
        description: ''
    },
    {
        title: 'SQL Queries',
        path: 'database/sql-queries',
        relative: true,
        description: ''
    },
    {
        title: 'Database',
        path: 'database',
        relative: true,
        description: ''
    },

];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/administration';
export const MODULE_NAME = 'Administration';
