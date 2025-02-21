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
        title: 'Applet Building Stepper',
        path: 'applet-build-stepper',
        relative: true,
        description: 'This is decent, but not at all the modern and clean look I want.'
    },
    {
        title: 'Nice demo with selecting any recipe and adjusting the display style.',
        path: 'connected-broker-test',
        relative: true,
        description: 'Definitely one we could expand to show all options. (But getting some errors)'
    },
    {
        title: 'Components with sliding wrapper',
        path: 'one-column-live',
        relative: true,
        description: 'Components with sliding wrapper, but seems to have some problems, and no way to run a recipe.'
    },
    {
        title: 'Dynamic Components, normal colors',
        path: 'sample-travel-info/dynamic',
        relative: true,
        description: 'Normal colors but with some issues with pink background on components'
    },
    {
        title: 'Live Recipe Pink Blue',
        path: 'sample-travel-info/pink-blue',
        relative: true,
        description: 'Live recipe display but not properly done.'
    },
    {
        title: 'Sample Travel Info',
        path: 'sample-travel-info',
        relative: true,
        description: 'Hard-coded component display'
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/broker-value-test';
export const MODULE_NAME = 'Broker Values Section Test';
