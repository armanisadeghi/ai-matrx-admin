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
        title: 'Entity Management Smart Fields',
        path: 'entity-management-smart-fields',
        relative: true,
        description: 'Uses the new smart fields system\n\n' +
            'STATUS: Working',
    },
    {
        title: 'Dynamic Entity Management Page',
        path: 'entity-management',
        relative: true,
        description: 'This is the first of the pages which allows for dynamic rendering of pages with different layouts.\n\n' +
            'STATUS: Working'
    },


    {
        title: 'Entity New Form (Unkown)',
        path: 'new-entity-form',
        relative: true,
        description: 'Errors due to apparently rendering without an entity being selected. Not sure how old this is or how new.'
    },


    {
        title: 'Entity Form With Full Container',
        path: 'entity-form-full-container',
        relative: true,
        description: 'Full Container which extracts away the complexities, but might not give the full power later for doing other things. We will see.\n\n' +
            'STATUS: Working.'
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
        title: 'Entity Form (Attempt)',
        path: 'entity-form',
        relative: true,
        description: 'Latest Implementation - Simple single-form direct, with Redux\n\nSTATUS: Errors due to usage of stateHelpUtils Error'
    },


    {
        title: 'Trying to Learn How handlers Work',
        path: 'components-with-buttons/learn-handlers',
        relative: true,
        description: ''
    },
    {
        title: 'Presentation Direct Component Tests',
        path: 'components-with-buttons/armani-action-test/presentation-tests/direct-tests',
        relative: true,
        description: ''
    },
    {
        title: 'Presentation Tests',
        path: 'components-with-buttons/armani-action-test/presentation-tests',
        relative: true,
        description: ''
    },
    {
        title: 'Action Button Demo Version 4',
        path: 'components-with-buttons/action-button-four',
        relative: true,
        description: ''
    },
    {
        title: 'Dynamic Actions Aware',
        path: 'components-with-buttons/dynamic-actions-aware',
        relative: true,
        description: 'This one is an attempt at allowing normal fields first and only triggering Action Fields when needed.'
    },
    {
        title: 'New Dynamic Action Creator System',
        path: 'components-with-buttons/dynamic-actions-new',
        relative: true,
        description: 'This is my attempt to really and truly make it all separate and fully dynamic.'
    },
    {
        title: 'Dynamic Action Creator System',
        path: 'components-with-buttons/dynamic-actions',
        relative: true,
        description: 'I got this one to work and be slightly more dynamic, but I did not incorporate everything because I want to make it even more dynamic.',
    },

    {
        title: 'Action Button Demo Version 3',
        path: 'components-with-buttons/action-button-three',
        relative: true,
        description: 'Designed to allow for custom components'
    },
    {
        title: 'Action Button Demo Version 2',
        path: 'components-with-buttons/action-button-two',
        relative: true,
        description: 'Designed to work with potential Redux integration'
    },
    {
        title: 'Action Button Demo',
        path: 'components-with-buttons/action-button-demo',
        relative: true,
        description: 'Based on Sample Fields with Buttons, and not as good, but with some different things demonstrated'
    },
    {
        title: 'Sample Fields with Buttons',
        path: 'components-with-buttons',
        relative: true,
        description: 'A bunch of direct sample fields that have buttons built in to trigger things'
    },

    {
        title: 'Animated Form Modal',
        path: 'animated-form-modal',
        relative: true,
        description: 'Modal with both single page and Multi-Step form options'
    },
    {
        title: 'Animated Form',
        path: 'animated-form',
        relative: true,
        description: 'Very basic form using a small amount of local data'
    },
    {
        title: 'Animated Form Page Alt',
        path: 'animated-form-page-alt',
        relative: true,
        description: 'Includes Layout options, but not the latest implementation'

    },
    {
        title: 'Animated Modal Tabs',
        path: 'animated-modal-tabs',
        relative: true,
        description: 'Modal with tabs and a form in each tab. Connected to Redux'
    },
    {
        title: 'Animated Form Page',
        path: 'animated-form-page',
        relative: true,
        description: 'Appears to be the latest implementation'
    },
    {
        title: 'Raw Form',
        path: 'raw',
        relative: true,
        description: 'Latest Implementation - Simple single-form direct, with Redux'
    },

];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/forms';
export const MODULE_NAME = 'Forms Tester Module';
