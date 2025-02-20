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
        title: 'Input Components 4 (With Layout)',
        path: 'input-components-4',
        relative: true,
        description: 'Airbnb Inspired Broker Input Components'
    },
    {
        title: 'Broker Value Test',
        path: 'value-broker-test',
        relative: true,
        description: 'Small test to see if the new broker value hook works properly'
    },
    {
        title: 'Input Components 3 (Configurable)',
        path: 'input-components-3',
        relative: true,
        description: 'Airbnb Inspired Broker Input Components'
    },
    {
        title: 'Input Components 2',
        path: 'input-components-2',
        relative: true,
        description: 'Airbnb Inspired Broker Input Components'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/applet-tests';
export const MODULE_NAME = 'Applet Tests';
