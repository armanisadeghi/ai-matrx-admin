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

    // {
    //     title: 'Inline Chip Editor',
    //     path: 'inline-chip-editor',
    //     relative: true,
    //     description: ''
    // },
    // {
    //     title: 'Brokers Component Demo Five',
    //     path: 'brokers-five',
    //     relative: true,
    //     description: ''
    // },
    // {
    //     title: 'Brokers Component Demo Four',
    //     path: 'brokers-four',
    //     relative: true,
    //     description: ''
    // },
    // {
    //     title: 'Brokers Component Demo Three',
    //     path: 'brokers-three',
    //     relative: true,
    //     description: ''
    // },
    // {
    //     title: 'Brokers Component Demo Two',
    //     path: 'brokers-two',
    //     relative: true,
    //     description: 'This one now has a hook for management, the addition of a main controlling component, and some more features.'
    // },
    // {
    //     title: 'Brokers Component Demo One',
    //     path: 'brokers-one',
    //     relative: true,
    //     description: 'Basic implementation to get brokers in a nice way in a sidebar.'
    // },
    {
        title: 'Inline Chip Editor 3',
        path: 'inline-chip-editor-3',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Inline Chip Editor 4',
        path: 'inline-chip-editor-4',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/recipe-creation';
export const MODULE_NAME = 'Recipe Creation';
