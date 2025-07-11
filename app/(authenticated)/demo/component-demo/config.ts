// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Transformable Cards Demo',
        path: 'draggables/transformable-cards-demo',
        relative: true,
        description: 'Cards that transform into pills when dragged into containers'
    },
    {
        title: 'Container Drop Demo',
        path: 'draggables/container-drop-demo',
        relative: true,
        description: 'Draggable cards that can be assigned to containers'
    },
    {
        title: 'Draggable Interactive Cards',
        path: 'draggables/draggable-interactive-cards',
        relative: true,
        description: 'Interactive cards with physics-based dragging'
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
        title: 'Context Collection Screenshot Demo',
        path: 'screenshot-demo/context-collection',
        relative: true,
        description: ''
    },
    {
        title: 'Screenshot Demo',
        path: 'screenshot-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Light Switch Button 2',
        path: 'light-switch-button/light-switch-button-2',
        relative: true,
        description: ''
    },
    {
        title: 'Light Switch Button',
        path: 'light-switch-button',
        relative: true,
        description: ''
    },
    {
        title: 'Very basic toast demo',
        path: 'toast-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Select Demo 4',
        path: 'selects/selects-4',
        relative: true,
        description: ''
    },
    {
        title: 'Select Demo 3',
        path: 'selects/selects-3',
        relative: true,
        description: ''
    },
    {
        title: 'Select Demo 2',
        path: 'selects/selects-2',
        relative: true,
        description: ''
    },
    {
        title: 'Loading Button Demo 2',
        path: 'button/loading-button-demo-2',
        relative: true,
        description: ''
    },
    {
        title: 'Loading Button Demo',
        path: 'button/loading-button-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Entity Analyzer With Mock Data',
        path: 'entity-analyzer/mock-data',
        relative: true,
        description: ''
    },
    {
        title: 'Entity Analyzer',
        path: 'entity-analyzer',
        relative: true,
        description: ''
    },
    {
        title: 'Entity Select Demo',
        path: 'entity-select-demo',
        relative: true,
        description: ''
    },
    {
        title: 'Floating Labels Components Demo',
        path: 'floating-labels',
        relative: true,
        description: ''
    },
    {
        title: 'Chip Demo',
        path: 'chip-demo',
        relative: true,
        description: ''
    },
    {
        title: 'UUID Generator Page Demo',
        path: 'uuid-generator',
        relative: true,
        description: ''
    },
    {
        title: 'UUID Array Component Demo',
        path: 'uuid-array',
        relative: true,
        description: ''
    },
    {
        title: 'Select Component Demos',
        path: 'selects',
        relative: true,
        description: 'Includes the following variations: MatrxVirtualizedSelect, MatrxCascadingSelect, MatrxGroupedSelect, MatrxAsyncSelect, MatrxTagSelect, and MatrxSplitSelect'
    },
    {
        title: 'Entity Components Demo',
        path: 'entity-components',
        relative: true,
        description: ''
    },
    {
        title: 'Checkbox and Radio Group Component Demo',
        path: 'checkbox-radio',
        relative: true,
        description: ''
    },
    {
        title: 'JSON Viewer Component Demo',
        path: 'json-viewer',
        relative: true,
        description: 'This component is horrible! It is part of the new system but it is not working well at all.'
    },
    {
        title: 'Accordion Component Demo',
        path: 'accordion',
        relative: true,
        description: ''
    },
    {
        title: 'Button Component Demo',
        path: 'button',
        relative: true,
        description: ''
    },
    {
        title: 'Calendar Component Demo',
        path: 'calendar',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/demo/component-demo';
export const MODULE_NAME = 'Component Demo';
