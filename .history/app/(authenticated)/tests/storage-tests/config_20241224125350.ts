// config.ts

import { DirectoryTreeConfig } from "@/components/DirectoryTree/config";
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
        title: 'Supabase Bucket Test 7',
        path: 'storage-test-7',
        relative: true,
        description: ''
    },
    {
        title: 'Supabase Bucket Test 6',
        path: 'storage-test-6',
        relative: true,
        description: ''
    },
    {
        title: 'Supabase Bucket Test 5',
        path: 'storage-test-5',
        relative: true,
        description: ''
    },
    {
        title: 'Supabase Bucket Test 4',
        path: 'storage-test-4',
        relative: true,
        description: ''
    },
    {
        title: 'Supabase Bucket Test 3',
        path: 'storage-test-3',
        relative: true,
        description: ''
    },
    {
        title: 'Supabase Bucket Test 2',
        path: 'bucket-test-2',
        relative: true,
        description: 'This version uses separate components from the Components directory and has added features'
    },
    {
        title: 'Supabase Bucket Tests',
        path: 'bucket-tests',
        relative: true,
        description: 'Basic local version that appears to be working well for very basic features, but lacks folder/subfolder management'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/storage-tests';
export const MODULE_NAME = 'Storage Tests';

export const DEFAULT_STORAGE_TREE_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
};

