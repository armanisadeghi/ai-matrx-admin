// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";


// IMPORTANT: All must be added here to work: app\(authenticated)\(admin-auth)\constants\categories.tsx
// This is only for the menu at the top, not the page rendering logic.

export const pages: ModulePage[] = [
    {
        title: 'Content Blocks',
        path: 'content-blocks',
        relative: true,
        description: 'Manage content blocks and context menu items'
    },
    {
        title: 'Content Templates',
        path: 'content-templates',
        relative: true,
        description: 'Manage message templates for prompts'
    },
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
    {
        title: 'Prompt Apps',
        path: 'prompt-apps',
        relative: true,
        description: 'Manage prompt app categories, errors, and analytics'
    },

];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/administration';
export const MODULE_NAME = 'Administration';
