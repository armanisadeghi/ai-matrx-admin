// import { lazy } from 'react';
// import { configRegistry } from '../../unused-deprecated-to-be-removed/old-deprecated-config-registry';
// import { getLoadingComponent } from './loading-components';

// export type ConfigViewType = 'default' | 'alternative' | 'modern' | string;

// export interface Extractor {
//   brokerId: string;
//   path: string;
//   type: "list" | "single" | "map" | "text";
// }

// export interface ConfigViewEntry {
//   id: string;
//   name: string;
//   component: React.ComponentType<any>;
//   description?: string;
//   extractors?: Extractor[];
// }

// export interface ConfigViewMap {
//   [viewType: string]: ConfigViewEntry;
// }

// export interface ConfigViewRegistry {
//   [configType: string]: ConfigViewMap;
// }

// export const viewComponents = {
//   standardView: lazy(() => import('../view-components/CandidateProfileView')),
//   collapsibleView: lazy(() => import('../view-components/CandidateProfileWithCollapseView')),
//   modernView: lazy(() => import('../view-components/ModernCandidateProfileView')),
//   modernOneColumnView: lazy(() => import('../view-components/ModernOneColumnProfile')),
//   appSuggestions: lazy(() => import('../view-components/AppSuggestionsView')),
// };

// export const viewEntries: Record<string, ConfigViewEntry> = {
//   standard: {
//     id: 'standard',
//     name: 'Standard View',
//     component: viewComponents.standardView,
//     description: 'Default card-based view of candidate profile'
//   },
//   collapsible: {
//     id: 'collapsible',
//     name: 'Collapsible View',
//     component: viewComponents.collapsibleView,
//     description: 'Collapsible sections for a more compact view'
//   },
//   modern: {
//     id: 'modern',
//     name: 'Modern View',
//     component: viewComponents.modernView,
//     description: 'Modern design with gradient header and expandable sections'
//   },
//   modernOneColumnView: {
//     id: 'modernOneColumnView',
//     name: 'Modern One Column View',
//     component: viewComponents.modernOneColumnView,
//     description: 'Modern one-column view with gradient header and expandable sections'
//   },
//   appSuggestions: {
//     id: 'appSuggestions',
//     name: 'App Suggestions',
//     component: viewComponents.appSuggestions,
//     description: 'Display of app suggestions',
//     extractors: [
//       {
//         brokerId: 'app-suggestion-entry',
//         path: 'data["extracted"]["suggestions"]',
//         type: "list"
//       },
//       {
//         brokerId: 'image-descriptions',
//         path: 'data["extracted"]["suggestions"][?]["image_description"]',
//         type: "text"
//       }
//     ]
//   },
// };

// export const configViewMappings: Record<string, string[]> = {
//   candidate_profile: ['standard', 'collapsible', 'modern', 'modernOneColumnView'],
//   candidate_profile_structured: ['standard', 'collapsible', 'modern', 'modernOneColumnView'],
//   candidate_profile_modern: ['modern', 'standard', 'collapsible', 'modernOneColumnView'],
//   app_suggestions: ['appSuggestions'],
// };

// export const defaultViews: Record<string, string> = {
//   candidate_profile: 'standard',
//   candidate_profile_structured: 'modern',
//   candidate_profile_modern: 'modern',
//   candidate_profile_modern_one_column: 'modernOneColumnView',
//   app_suggestions: 'appSuggestions',
// };

// export const configViewRegistry: ConfigViewRegistry = Object.entries(configViewMappings).reduce(
//   (registry, [configType, viewIds]) => {
//     registry[configType] = {};
    
//     viewIds.forEach(viewId => {
//       const entry = viewEntries[viewId];
//       if (entry) {
//         registry[configType][viewId] = entry;
        
//         const defaultViewId = defaultViews[configType];
//         if (defaultViewId === viewId) {
//           registry[configType]['default'] = entry;
//         }
//       }
//     });
    
//     if (!registry[configType]['default'] && viewIds.length > 0) {
//       const firstViewId = viewIds[0];
//       registry[configType]['default'] = viewEntries[firstViewId];
//     }
    
//     return registry;
//   },
//   {} as ConfigViewRegistry
// );

// // ===== HELPER FUNCTIONS =====

// // Get all known config types
// export function getAllConfigTypes(): string[] {
//   return Object.values(configRegistry).map(entry => entry.type);
// }

// // Get a list of all view types across all config types
// export function getAllViewTypes(): string[] {
//   return Object.keys(viewEntries);
// }

// // Helper function to get config type from config key
// export function getConfigTypeFromKey(configKey: string): string | null {
//   return configRegistry[configKey]?.type || null;
// }

// // Helper function to get available views for a config type
// export function getAvailableViewsForConfigType(configType: string): string[] {
//   // If we have explicit mappings for this config type, use those
//   if (configViewMappings[configType]) {
//     return configViewMappings[configType];
//   }
  
//   // Otherwise return all available view types
//   return getAllViewTypes();
// }

// // Helper function to get view entry for a config type and view type
// export function getViewForConfig(configType: string, viewType: ConfigViewType = 'default'): ConfigViewEntry | null {
//   // If the config type isn't registered, fall back to candidate_profile
//   const configMap = configViewRegistry[configType] || configViewRegistry['candidate_profile'];
//   if (!configMap) {
//     console.warn(`[registry] No config map found for ${configType}, falling back to candidate_profile`);
//     return viewEntries.standard;
//   }
  
//   // If the requested view type doesn't exist in this config, fall back to default
//   if (!configMap[viewType]) {
//     console.warn(`[registry] No view type ${viewType} found for ${configType}, falling back to default`);
//     return configMap['default'] || viewEntries.standard;
//   }
  
//   console.log(`[registry] Found view for ${configType}/${viewType}:`, {
//     viewId: configMap[viewType].id,
//     viewName: configMap[viewType].name,
//     isDefault: viewType === 'default'
//   });
  
//   return configMap[viewType];
// }

// // Helper function to get the loading component for a specific view type
// export function getViewLoadingComponent(configType: string, viewType: ConfigViewType = 'default'): React.ComponentType<any> {
//   // Use the getLoadingComponent function from loading-components.tsx
//   return getLoadingComponent(configType || 'default');
// } 