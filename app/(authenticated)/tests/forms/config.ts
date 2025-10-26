// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Last Ever Entity Form Test!',
        path: 'entity-final-test',
        relative: true,
        description: ''
    },    
    {
        title: 'Entity Provider Test',
        path: 'entity-final-test/entity-provider-test',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Entity Management Smart Fields',
        path: 'entity-management-smart-fields',
        relative: true,
        description: 'Uses the new smart fields system\n\n' +
            'STATUS: Working',
    },
    {
        title: 'Entity Smart Armani Fields',
        path: 'entity-smart-armani-fields',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Dynamic Entity Management Page',
        path: 'entity-management',
        relative: true,
        description: 'This is the first of the pages which allows for dynamic rendering of pages with different layouts.\n\n' +
            'STATUS: Working'
    },
    {
        title: 'Entity Form With Basic Container',
        path: 'entity-form-basic-container',
        relative: true,
        description: 'Uses the Basic Container.\n\n' +
            'FORM TYPE: Uses Basic form with all input fields, but renders form first, without data, which could be interesting to test further. \n\n' +
            'STATUS: Working.'
    },
    {
        title: 'Single Entity Test',
        path: 'single-entity',
        relative: true,
        description: ''
    },
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/forms';
export const MODULE_NAME = 'Forms Tester Module';
