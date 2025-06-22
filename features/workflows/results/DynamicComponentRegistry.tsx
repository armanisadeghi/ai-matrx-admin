import React from 'react';
import SerpResultsPage from '@/features/workflows/results/registered-components/SerpResultsPage';
import EventDataDisplay from './registered-components/EventDataDisplay';
import SimpleTextDisplay from './registered-components/SimpleTextDisplay';
import SimpleObjectDisplay from './registered-components/SimpleObjectDisplay';
import SmartDisplay from './registered-components/SmartDisplay';
import ViewTablePage from '@/features/workflows/results/registered-components/ViewTablePage';
import SitemapViewer from './registered-components/SitemapViewer';

// Registry interface
export interface ComponentRegistryEntry {
    component: React.ComponentType<any>;
    displayName: string;
    description?: string;
    expectedProps?: string[];
}

// Component Registry - Add new components here
export const DYNAMIC_COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry> = {
    'SerpResultsPage': {
        component: SerpResultsPage,
        displayName: 'SERP Results Page',
        description: 'Displays search engine results page analysis',
        expectedProps: ['data']
    },

    'EventDataDisplay': {
        component: EventDataDisplay,
        displayName: 'Event Data Display',
        description: 'Displays event data',
        expectedProps: ['data']
    },

    'SimpleTextDisplay': {
        component: SimpleTextDisplay,
        displayName: 'Simple Text Display',
        description: 'Displays a simple text',
        expectedProps: ['brokerId', 'keyToDisplay']
    },

    'SimpleObjectDisplay': {
        component: SimpleObjectDisplay,
        displayName: 'Simple Object Display',
        description: 'Displays a simple object',
        expectedProps: ['brokerId', 'keyToDisplay']
    },

    'SmartDisplay': {
        component: SmartDisplay,
        displayName: 'Smart Display',
        description: 'Displays a smart display',
        expectedProps: ['brokerId', 'keyToDisplay']
    },

    'ViewTablePage': {
        component: ViewTablePage,
        displayName: 'View Table Page',
        description: 'Displays a table',
        expectedProps: ['tableId']
    },
    'SitemapViewer': {
        component: SitemapViewer,
        displayName: 'Sitemap Viewer',
        description: 'Displays a sitemap viewer',
        expectedProps: ['data']
    },
    
   
    // Add more components here as needed
    // 'AnotherComponent': {
    //     component: AnotherComponent,
    //     displayName: 'Another Component',
    //     description: 'Description of what this component does',
    //     expectedProps: ['prop1', 'prop2']
    // },
};

// Helper function to get component by name
export const getComponentByName = (componentName: string): ComponentRegistryEntry | null => {
    return DYNAMIC_COMPONENT_REGISTRY[componentName] || null;
};

// Helper function to get all available component names
export const getAvailableComponentNames = (): string[] => {
    return Object.keys(DYNAMIC_COMPONENT_REGISTRY);
};

// Helper function to validate if component exists
export const isValidComponentName = (componentName: string): boolean => {
    return componentName in DYNAMIC_COMPONENT_REGISTRY;
};

export default DYNAMIC_COMPONENT_REGISTRY; 