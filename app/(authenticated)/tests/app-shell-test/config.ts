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
        title: 'Multi-Option Layouts',
        path: 'layout-choices',
        relative: true,
        description: ''
    },
    {
        title: 'Single Option Layout',
        path: 'single-option',
        relative: true,
        description: ''
    },
    {
        title: 'Single Option Layout Choices',
        path: 'single-option/layout-choices',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Sample Nested',
        path: 'single-option/sample-nested',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Sample Nested Again',
        path: 'single-option/sample-nested/sample-nested-again',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/app-shell-test';
export const MODULE_NAME = 'App Shell Test';
