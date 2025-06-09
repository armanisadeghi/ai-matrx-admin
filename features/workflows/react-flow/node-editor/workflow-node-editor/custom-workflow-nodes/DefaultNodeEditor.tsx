'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BaseNode, TabComponentProps } from '@/features/workflows/types';
import ErrorDisplay from './components/ErrorDisplay';

// Import all default tabs
import OverviewTab from './tabs/OverviewTab';
import ArgumentsTab from './tabs/ArgumentsTab';
import MappingsTab from './tabs/MappingsTab';
import DependenciesTab from './tabs/DependenciesTab';
import BrokersTab from './tabs/BrokersTab';
import DescriptionTab from './tabs/DescriptionTab';
import ResultsTab from './tabs/ResultsTab';
import AdminTab from './tabs/AdminTab';

// Define the structure for tab configuration with proper typing
export interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<TabComponentProps>;
}

// Define the structure for custom tabs
export interface CustomTabConfig extends TabConfig {
  replaces?: string; // ID of default tab to replace
  order?: number; // Optional order for positioning (lower numbers appear first)
}

interface DefaultNodeEditorProps {
  node: BaseNode;
  onNodeUpdate: (node: BaseNode) => void;
  customTabs?: CustomTabConfig[]; // Custom tabs to add or replace defaults
  additionalTabs?: TabConfig[]; // Additional tabs to append
  hiddenTabs?: string[]; // Tab IDs to hide
  validationErrors?: string[];
}

// Default tab configurations - now properly typed
const DEFAULT_TABS: TabConfig[] = [
  { id: 'basic', label: 'Overview', component: OverviewTab },
  { id: 'arguments', label: 'Arguments', component: ArgumentsTab },
  { id: 'dependencies', label: 'Dependencies', component: DependenciesTab },
  { id: 'brokers', label: 'Brokers', component: BrokersTab },
  { id: 'mappings', label: 'Mappings', component: MappingsTab },
  { id: 'description', label: 'Description', component: DescriptionTab },
  { id: 'results', label: 'Results', component: ResultsTab },
  { id: 'object', label: 'Admin', component: AdminTab },
];

/**
 * DefaultNodeEditor - Replicates the exact functionality of WorkflowNodeEditor
 * but allows for complete customization of individual tabs
 * Now with proper TypeScript typing to ensure all tab components receive correct props
 */
const DefaultNodeEditor: React.FC<DefaultNodeEditorProps> = ({ 
  node,
  onNodeUpdate,
  customTabs = [],
  additionalTabs = [],
  hiddenTabs = [],
  validationErrors = []
}) => {

  // Build the final tabs configuration
  const buildTabsConfig = (): TabConfig[] => {
    let tabs = [...DEFAULT_TABS];
    
    // Filter out hidden tabs
    tabs = tabs.filter(tab => !hiddenTabs.includes(tab.id));
    
    // Handle custom tabs that replace existing tabs
    const replacementTabs: CustomTabConfig[] = [];
    const newTabs: CustomTabConfig[] = [];
    
    customTabs.forEach(customTab => {
      if (customTab.replaces) {
        replacementTabs.push(customTab);
      } else {
        newTabs.push(customTab);
      }
    });
    
    // Replace default tabs with custom tabs if specified
    replacementTabs.forEach(customTab => {
      const replaceIndex = tabs.findIndex(tab => tab.id === customTab.replaces);
      if (replaceIndex !== -1) {
        tabs[replaceIndex] = customTab;
      }
    });
    
    // Add new tabs and additional tabs
    const allNewTabs = [...newTabs, ...additionalTabs];
    
    // If any tabs have order specified, use it for positioning
    const hasOrdering = customTabs.some(tab => tab.order !== undefined);
    
    if (hasOrdering) {
      // Add new tabs to the array first
      tabs = [...tabs, ...allNewTabs];
      
      // Create a map of default positions for tabs that don't have explicit ordering
      const defaultOrders: { [key: string]: number } = {
        'basic': 10,
        'arguments': 20,
        'dependencies': 30,
        'brokers': 40,
        'mappings': 50,
        'description': 55,
        'results': 57,
        'object': 60
      };
      
      // Sort all tabs by order, using default orders for tabs without explicit order
      tabs.sort((a, b) => {
        const orderA = 'order' in a && (a as CustomTabConfig).order !== undefined 
          ? (a as CustomTabConfig).order! 
          : (defaultOrders[a.id] || 100);
          
        const orderB = 'order' in b && (b as CustomTabConfig).order !== undefined 
          ? (b as CustomTabConfig).order! 
          : (defaultOrders[b.id] || 100);
        
        return orderA - orderB;
      });
    } else {
      // No ordering specified, use legacy behavior
      tabs = [...tabs, ...allNewTabs];
    }
    
    return tabs;
  };

  const finalTabs = buildTabsConfig();

  return (
    <div className="flex flex-col h-full">
      {/* Global validation errors display */}
      {validationErrors.length > 0 && (
        <ErrorDisplay errors={validationErrors} className="mx-4 mt-4" />
      )}
      
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue={finalTabs[0]?.id} className="w-full h-full flex flex-col">
          <TabsList className="grid w-full flex-shrink-0" style={{ gridTemplateColumns: `repeat(${finalTabs.length}, minmax(0, 1fr))` }}>
            {finalTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {finalTabs.map(tab => {
              const TabComponent = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id}>
                  <TabComponent node={node} onNodeUpdate={onNodeUpdate} />
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default DefaultNodeEditor; 