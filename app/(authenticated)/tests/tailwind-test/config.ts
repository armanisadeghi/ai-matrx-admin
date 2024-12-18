// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Animations',
        path: 'animations',
        relative: true,
        description: ''
    },
    {
        title: 'Color Converter',
        path: 'color-converter',
        relative: true,
        description: ''
    },
    {
        title: 'Color Conversion Tester',
        path: 'color-converter/color-conversion-tester',
        relative: true,
        description: ''
    },
    {
        title: 'Color Swatches',
        path: 'color-swatches',
        relative: true,
        description: ''
    },
    {
        title: 'Demo Page',
        path: 'demo-page',
        relative: true,
        description: ''
    },
    {
        title: 'Image Textures',
        path: 'image-textures',
        relative: true,
        description: ''
    },
    {
        title: 'Noise Textures',
        path: 'noise-textures',
        relative: true,
        description: ''
    },
    {
        title: 'Textured Example',
        path: 'textured-example',
        relative: true,
        description: ''
    },
    {
        title: 'Theme Tests',
        path: 'theme-tests',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = 'tailwind-test';
export const MODULE_NAME = 'Tailwind Tests';
