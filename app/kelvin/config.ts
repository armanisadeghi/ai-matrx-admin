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
        title: 'Version 1',
        path: 'version-1',
        relative: true,
        description: 'Version 1',
    }
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/kelvin/code-editor';
export const MODULE_NAME = 'Code editor tests';

export const DEFAULT_STORAGE_TREE_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
};

