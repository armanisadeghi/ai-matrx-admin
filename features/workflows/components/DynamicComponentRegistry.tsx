import React from 'react';
import SerpResultsPage from '@/features/scraper/parts/recipes/SerpResultsPage';

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