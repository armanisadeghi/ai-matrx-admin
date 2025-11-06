'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { promptBuilderTabs, additionalTabs, promptTemplateSource } from './constants';

// Create a combined tabs array with tabNumber
const allTabs = [
  ...promptBuilderTabs.map((tab, index) => ({ ...tab, tabNumber: index + 1 })),
  ...additionalTabs.map((tab, index) => ({ ...tab, tabNumber: promptBuilderTabs.length + index + 1 }))
];

// The master prompt template - EDIT THIS STRING to control the structure and order
const PROMPT_TEMPLATE = `You are a friendly assistant.

<<TAB_1>><<T/AB_1>>

<<TAB_2>><<T/AB_2>>

<<TAB_3>><<T/AB_3>>

<<TAB_4>><<T/AB_4>>

Consider using the following information and guidance:

<<TAB_5>><<T/AB_5>>

<<TAB_6>><<T/AB_6>>

<<TAB_7>><<T/AB_7>>

<<TAB_8>><<T/AB_8>>

<<TAB_9>><<T/AB_9>>

<<TAB_10>><<T/AB_10>>

Additional information:

<<TAB_11>><<T/AB_11>>

<<TAB_12>><<T/AB_12>>

<<TAB_13>><<T/AB_13>>

<<TAB_14>><<T/AB_14>>

Remember to be helpful, accurate, and respond directly to the user's needs.`;

// Store tab content but don't update the prompt continuously
interface TabContentMap {
  [tabNumber: number]: string;
}

interface PromptBuilderContextProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  enabledSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  globalPrompt: string;
  setGlobalPrompt: (prompt: string) => void;
  finalPrompt: string;
  generateFinalPrompt: () => string;
  getTabByIndex: (index: number) => any;
  allTabs: typeof allTabs;
  updateTabContent: (tabNumber: number, content: string) => void;
}

const PromptBuilderContext = createContext<PromptBuilderContextProps | undefined>(undefined);

export const PromptBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(allTabs[0].id);
  
  // Initialize enabled state for all tabs (all are enabled by default)
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>(
    allTabs.reduce((acc, tab) => {
      // All tabs are enabled by default except for specific ones you may want to disable
      acc[tab.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );
  
  // Store tab content separately from the prompt template
  const [tabContentMap, setTabContentMap] = useState<TabContentMap>({});
  
  // Keep the global prompt template
  const [globalPrompt, setGlobalPrompt] = useState(PROMPT_TEMPLATE);
  
  // The final processed prompt to be displayed/copied
  const [finalPrompt, setFinalPrompt] = useState('');
  
  // Update content for a specific tab - memoize to prevent unnecessary re-renders
  const updateTabContent = useCallback((tabNumber: number, content: string) => {
    setTabContentMap(prev => {
      // Only update if the content has actually changed
      if (prev[tabNumber] === content) return prev;
      return {
        ...prev,
        [tabNumber]: content
      };
    });
  }, []);
  
  // Toggle a section's enabled state
  const toggleSection = useCallback((sectionId: string) => {
    setEnabledSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  // Function to get a tab by its index number
  const getTabByIndex = useCallback((index: number) => {
    return allTabs.find(tab => tab.tabNumber === index);
  }, []);
  
  // Process the global prompt to create the final output
  const generateFinalPrompt = useCallback(() => {
    // Start with the template
    let processedPrompt = globalPrompt;
    
    // Replace each tab placeholder with its content if the section is enabled
    allTabs.forEach(tab => {
      const tabNumber = tab.tabNumber;
      const isEnabled = enabledSections[tab.id];
      const content = tabContentMap[tabNumber] || '';
      const placeholder = `<<TAB_${tabNumber}>><<T/AB_${tabNumber}>>`;
      
      if (isEnabled && content.trim()) {
        // Replace the placeholder with the content
        processedPrompt = processedPrompt.replace(placeholder, content);
      } else {
        // Remove the placeholder if disabled or empty
        processedPrompt = processedPrompt.replace(placeholder, '');
      }
    });
    
    // Clean up any remaining placeholders
    processedPrompt = processedPrompt.replace(/<<TAB_\d+>><<T\/AB_\d+>>/g, '');
    
    // Clean up multiple consecutive newlines
    processedPrompt = processedPrompt.replace(/\n{3,}/g, '\n\n').trim();
    
    return processedPrompt;
  }, [globalPrompt, enabledSections, tabContentMap]);
  
  // Update the final prompt only when the preview tab is active or on demand
  useEffect(() => {
    if (activeTab === 'preview') {
      setFinalPrompt(generateFinalPrompt());
    }
  }, [activeTab, generateFinalPrompt]);
  
  return (
    <PromptBuilderContext.Provider
      value={{
        activeTab,
        setActiveTab,
        enabledSections,
        toggleSection,
        globalPrompt,
        setGlobalPrompt,
        finalPrompt,
        generateFinalPrompt,
        getTabByIndex,
        allTabs,
        updateTabContent
      }}
    >
      {children}
    </PromptBuilderContext.Provider>
  );
};

// Custom hook to use the prompt builder context
export const usePromptBuilder = () => {
  const context = useContext(PromptBuilderContext);
  if (context === undefined) {
    throw new Error('usePromptBuilder must be used within a PromptBuilderProvider');
  }
  return context;
}; 