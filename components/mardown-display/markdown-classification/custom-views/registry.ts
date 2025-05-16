import { lazy } from 'react';
import { knownConfigOptions } from '../known-configs';

// Define types for our registry
export type ConfigViewType = 'default' | 'alternative' | string;

export interface ConfigViewEntry {
  name: string;
  component: React.ComponentType<any>;
}

export interface ConfigViewMap {
  [viewType: string]: ConfigViewEntry;
}

// Define interface for our registry
export interface ConfigViewRegistry {
  [configType: string]: ConfigViewMap;
}

// Dynamically import the view components
const CandidateProfileView = lazy(() => import('./CandidateProfileView'));
const CandidateProfileWithCollapse = lazy(() => import('./CandidateProfileWithCollapse'));

// Create the registry
export const configViewRegistry: ConfigViewRegistry = {
  // Register views for candidate_profile config
  candidate_profile: {
    default: {
      name: 'Standard View',
      component: CandidateProfileView
    },
    alternative: {
      name: 'Collapsible View',
      component: CandidateProfileWithCollapse
    }
  },
  // Additional configurations will be added here
};

// Helper function to get config type from config key
export function getConfigTypeFromKey(configKey: string): string | null {
  return knownConfigOptions[configKey]?.type || null;
}

// Helper function to get available views for a config type
export function getAvailableViewsForConfigType(configType: string): string[] {
  if (!configViewRegistry[configType]) return [];
  return Object.keys(configViewRegistry[configType]);
}

// Helper function to get view entry for a config type and view type
export function getViewForConfig(configType: string, viewType: ConfigViewType = 'default'): ConfigViewEntry | null {
  if (!configViewRegistry[configType]) return null;
  
  // If the requested view type doesn't exist, fall back to 'default'
  if (!configViewRegistry[configType][viewType]) {
    return configViewRegistry[configType]['default'] || null;
  }
  
  return configViewRegistry[configType][viewType];
} 