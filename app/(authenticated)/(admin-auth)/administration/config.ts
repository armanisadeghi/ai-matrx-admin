// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Server Cache',
        path: 'server-cache',
        relative: true,
        description: 'Manage server-side caches'
    },
    {
        title: 'TypeScript Errors',
        path: 'typescript-errors',
        relative: true,
        description: 'View TypeScript compilation errors'
    },
    {
        title: 'SQL Functions',
        path: 'database/sql-functions',
        relative: true,
        description: 'Manage SQL functions'
    },
    {
        title: 'SQL Queries',
        path: 'database/sql-queries',
        relative: true,
        description: 'Execute SQL queries'
    },
    {
        title: 'Database',
        path: 'database',
        relative: true,
        description: 'Database management'
    },

];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/administration';
export const MODULE_NAME = 'Administration';
