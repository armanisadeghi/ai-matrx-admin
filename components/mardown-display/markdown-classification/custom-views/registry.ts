import { lazy } from 'react';
import { configRegistry } from '../json-config-system/config-registry';
import { getLoadingComponent } from './loading-components';

// Define types for our registry
export type ConfigViewType = 'default' | 'alternative' | 'modern' | string;

export interface Extractor {
  brokerId: string;
  path: string;
  type: "list" | "single" | "map" | "text";
}

export interface ConfigViewEntry {
  id: string;        // Unique identifier for the view
  name: string;      // Display name
  component: React.ComponentType<any>;
  description?: string; // Optional description
  extractors?: Extractor[];
}

export interface ConfigViewMap {
  [viewType: string]: ConfigViewEntry;
}

// Define interface for our registry
export interface ConfigViewRegistry {
  [configType: string]: ConfigViewMap;
}

// ===== STEP 1: Define all available view components =====
// This is the single source of truth for all view components
export const viewComponents = {
  // Standard views
  standardView: lazy(() => import('./CandidateProfileView')),
  collapsibleView: lazy(() => import('./CandidateProfileWithCollapse')),
  modernView: lazy(() => import('./ModernCandidateProfile')),
  modernOneColumnView: lazy(() => import('./ModernOneColumnProfile')),
  appSuggestions: lazy(() => import('./AppSuggestionsDisplay')),

  // Add new view components here
  // newView: lazy(() => import('./NewViewComponent')),
};

// ===== STEP 2: Define all available view entries =====
// This maps component references to metadata about each view
export const viewEntries: Record<string, ConfigViewEntry> = {
  // Standard views
  standard: {
    id: 'standard',
    name: 'Standard View',
    component: viewComponents.standardView,
    description: 'Default card-based view of candidate profile'
  },
  collapsible: {
    id: 'collapsible',
    name: 'Collapsible View',
    component: viewComponents.collapsibleView,
    description: 'Collapsible sections for a more compact view'
  },
  modern: {
    id: 'modern',
    name: 'Modern View',
    component: viewComponents.modernView,
    description: 'Modern design with gradient header and expandable sections'
  },
  modernOneColumnView: {
    id: 'modernOneColumnView',
    name: 'Modern One Column View',
    component: viewComponents.modernOneColumnView,
    description: 'Modern one-column view with gradient header and expandable sections'
  },
  appSuggestions: {
    id: 'appSuggestions',
    name: 'App Suggestions',
    component: viewComponents.appSuggestions,
    description: 'Display of app suggestions',
    extractors: [
      {
        brokerId: 'app-suggestion-entry',
        path: 'data["extracted"]["suggestions"]',
        type: "list"
      },
      {
        brokerId: 'image-descriptions',
        path: 'data["extracted"]["suggestions"][?]["image_description"]',
        type: "text"
      }
    ]
  },
  

  // Add new view entries here
  // newViewType: {
  //   id: 'newViewType',
  //   name: 'New View Name',
  //   component: viewComponents.newView,
  //   description: 'Description of the new view'
  // },
};

// ===== STEP 3: Map config types to available views =====
// This defines which views are available for each config type
export const configViewMappings: Record<string, string[]> = {
  // Config types map to arrays of view entry IDs
  candidate_profile: ['standard', 'collapsible', 'modern', 'modernOneColumnView'],
  candidate_profile_structured: ['standard', 'collapsible', 'modern', 'modernOneColumnView'],
  candidate_profile_modern: ['modern', 'standard', 'collapsible', 'modernOneColumnView'],
  app_suggestions: ['appSuggestions'],

  // Add new mappings here
  // new_config_type: ['standard', 'newViewType'],
};

// ===== STEP 4: Define default views for each config type =====
// This defines the default view to use for each config type
export const defaultViews: Record<string, string> = {
  candidate_profile: 'standard',
  candidate_profile_structured: 'modern',
  candidate_profile_modern: 'modern',
  candidate_profile_modern_one_column: 'modernOneColumnView',
  app_suggestions: 'appSuggestions',

  // Add new defaults here
  // new_config_type: 'newViewType',
};

// Create the registry based on the mappings above
export const configViewRegistry: ConfigViewRegistry = Object.entries(configViewMappings).reduce(
  (registry, [configType, viewIds]) => {
    registry[configType] = {};
    
    // For each view ID in the mapping
    viewIds.forEach(viewId => {
      const entry = viewEntries[viewId];
      if (entry) {
        // Use the view ID as the key, and set the first one as default
        registry[configType][viewId] = entry;
        
        // Also set the default view
        const defaultViewId = defaultViews[configType];
        if (defaultViewId === viewId) {
          registry[configType]['default'] = entry;
        }
      }
    });
    
    // Ensure a default exists
    if (!registry[configType]['default'] && viewIds.length > 0) {
      const firstViewId = viewIds[0];
      registry[configType]['default'] = viewEntries[firstViewId];
    }
    
    return registry;
  },
  {} as ConfigViewRegistry
);

// ===== HELPER FUNCTIONS =====

// Get all known config types
export function getAllConfigTypes(): string[] {
  return Object.values(configRegistry).map(entry => entry.type);
}

// Get a list of all view types across all config types
export function getAllViewTypes(): string[] {
  return Object.keys(viewEntries);
}

// Helper function to get config type from config key
export function getConfigTypeFromKey(configKey: string): string | null {
  return configRegistry[configKey]?.type || null;
}

// Helper function to get available views for a config type
export function getAvailableViewsForConfigType(configType: string): string[] {
  // If we have explicit mappings for this config type, use those
  if (configViewMappings[configType]) {
    return configViewMappings[configType];
  }
  
  // Otherwise return all available view types
  return getAllViewTypes();
}

// Helper function to get view entry for a config type and view type
export function getViewForConfig(configType: string, viewType: ConfigViewType = 'default'): ConfigViewEntry | null {
  // If the config type isn't registered, fall back to candidate_profile
  const configMap = configViewRegistry[configType] || configViewRegistry['candidate_profile'];
  if (!configMap) {
    console.warn(`[registry] No config map found for ${configType}, falling back to candidate_profile`);
    return viewEntries.standard;
  }
  
  // If the requested view type doesn't exist in this config, fall back to default
  if (!configMap[viewType]) {
    console.warn(`[registry] No view type ${viewType} found for ${configType}, falling back to default`);
    return configMap['default'] || viewEntries.standard;
  }
  
  console.log(`[registry] Found view for ${configType}/${viewType}:`, {
    viewId: configMap[viewType].id,
    viewName: configMap[viewType].name,
    isDefault: viewType === 'default'
  });
  
  return configMap[viewType];
}

// Helper function to get the loading component for a specific view type
export function getViewLoadingComponent(configType: string, viewType: ConfigViewType = 'default'): React.ComponentType<any> {
  // Use the getLoadingComponent function from loading-components.tsx
  return getLoadingComponent(configType || 'default');
} 