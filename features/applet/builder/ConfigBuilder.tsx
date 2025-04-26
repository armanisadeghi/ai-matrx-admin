import React, { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TabSearchConfig, 
  SearchGroupConfig, 
  GroupFieldConfig 
} from '../runner/components/field-components/types';
import { Stepper } from './components/Stepper';
import { AppletInfoStep } from './components/AppletInfoStep';
import { TabsConfigStep } from './components/TabsConfigStep';
import { GroupsConfigStep } from './components/GroupsConfigStep';
import { FieldsConfigStep } from './components/FieldsConfigStep';
import { PreviewConfig } from './components/PreviewConfig';

export type AppletConfig = {
  id: string;
  name: string;
  description: string;
  tabs: { value: string; label: string }[];
  searchConfig: TabSearchConfig;
}

export const ConfigBuilder = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [config, setConfig] = useState<Partial<AppletConfig>>({
    tabs: [],
    searchConfig: {}
  });
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  
  const steps = [
    { id: 'applet-info', title: 'Applet Information', description: 'Basic information about your applet' },
    { id: 'tabs-config', title: 'Tabs Configuration', description: 'Define the tabs for your applet' },
    { id: 'groups-config', title: 'Groups Configuration', description: 'Create search groups for each tab' },
    { id: 'fields-config', title: 'Fields Configuration', description: 'Define fields for each search group' },
    { id: 'preview', title: 'Preview & Export', description: 'Review and export your configuration' }
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const updateConfig = (updates: Partial<AppletConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const updateActiveTab = (tabValue: string) => {
    setActiveTab(tabValue);
    setActiveGroup(null);
  };

  const updateActiveGroup = (groupId: string) => {
    setActiveGroup(groupId);
  };

  const addTab = (tab: { value: string; label: string }) => {
    const updatedTabs = [...(config.tabs || []), tab];
    setConfig(prev => ({
      ...prev,
      tabs: updatedTabs,
      searchConfig: {
        ...prev.searchConfig,
        [tab.value]: []
      }
    }));
    if (!activeTab) {
      setActiveTab(tab.value);
    }
  };

  const addGroup = (group: SearchGroupConfig) => {
    if (activeTab) {
      const updatedSearchConfig = { ...config.searchConfig };
      updatedSearchConfig[activeTab] = [
        ...(updatedSearchConfig[activeTab] || []),
        group
      ];
      
      setConfig(prev => ({
        ...prev,
        searchConfig: updatedSearchConfig
      }));
      
      setActiveGroup(group.id);
    }
  };

  const addField = (field: GroupFieldConfig) => {
    if (activeTab && activeGroup) {
      const updatedSearchConfig = { ...config.searchConfig };
      const groupIndex = updatedSearchConfig[activeTab].findIndex(g => g.id === activeGroup);
      
      if (groupIndex !== -1) {
        updatedSearchConfig[activeTab][groupIndex].fields = [
          ...updatedSearchConfig[activeTab][groupIndex].fields,
          field
        ];
        
        setConfig(prev => ({
          ...prev,
          searchConfig: updatedSearchConfig
        }));
      }
    }
  };

  return (
    <div className="w-full h-full px-4">
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Applet Configuration Builder</CardTitle>
          <CardDescription>Create search configurations for your applet</CardDescription>
        </CardHeader>
        <CardContent>
          <Stepper 
            steps={steps} 
            activeStep={activeStep} 
            onStepClick={(index) => setActiveStep(index)} 
          />
          
          <div className="mt-8">
            {activeStep === 0 && (
              <AppletInfoStep 
                config={config} 
                updateConfig={updateConfig} 
              />
            )}
            
            {activeStep === 1 && (
              <TabsConfigStep 
                tabs={config.tabs || []} 
                addTab={addTab}
                updateConfig={updateConfig}
                activeTab={activeTab}
                setActiveTab={updateActiveTab}
                config={config}
              />
            )}
            
            {activeStep === 2 && (
              <GroupsConfigStep 
                tabs={config.tabs || []}
                searchConfig={config.searchConfig || {}}
                activeTab={activeTab}
                activeGroup={activeGroup}
                setActiveTab={updateActiveTab}
                setActiveGroup={updateActiveGroup}
                addGroup={addGroup}
              />
            )}
            
            {activeStep === 3 && (
              <FieldsConfigStep 
                searchConfig={config.searchConfig || {}}
                activeTab={activeTab}
                activeGroup={activeGroup}
                setActiveTab={updateActiveTab}
                setActiveGroup={updateActiveGroup}
                addField={addField}
              />
            )}
            
            {activeStep === 4 && (
              <PreviewConfig config={config} />
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={activeStep === 0}
            className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={activeStep === steps.length - 1}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            {activeStep === steps.length - 2 ? 'Preview' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfigBuilder;
