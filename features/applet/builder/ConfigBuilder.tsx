'use client';

import React, { useState } from 'react';
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
  AvailableAppletConfigs, 
  AppletContainersConfig, 
  GroupFieldConfig 
} from '@/features/applet/runner/components/field-components/types';
import { Stepper } from '@/features/applet/builder/components/Stepper';
import { AppInfoStep } from '@/features/applet/builder/components/AppInfoStep';
import { AppletsConfigStep } from '@/features/applet/builder/components/AppletsConfigStep';
import { GroupsConfigStep } from '@/features/applet/builder/components/GroupsConfigStep';
import { FieldsConfigStep } from '@/features/applet/builder/components/FieldsConfigStep';
import { PreviewConfig } from '@/features/applet/builder/previews/PreviewConfig';

export type Applet = {
  id: string;
  name: string;
  description: string;
  creatorName?: string;
  imageUrl?: string;
  slug?: string;
}

export type AppConfig = {
  id: string;
  name: string;
  description: string;
  creatorName?: string;
  imageUrl?: string;
  applets: Applet[];
  searchConfig: AvailableAppletConfigs;
}

export const ConfigBuilder = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [config, setConfig] = useState<Partial<AppConfig>>({
    applets: [],
    searchConfig: {}
  });
  
  const [activeApplet, setActiveApplet] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  
  const steps = [
    { id: 'app-info', title: 'App Information', description: 'Basic information about your app' },
    { id: 'applets-config', title: 'Add Applets', description: 'Define & Configure Applets' },
    { id: 'groups-config', title: 'Broker Groups', description: 'Create groups of Brokers' },
    { id: 'fields-config', title: 'Broker Fields', description: 'Define fields for each Broker' },
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

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const updateActiveApplet = (appletId: string) => {
    setActiveApplet(appletId);
    setActiveGroup(null);
  };

  const updateActiveGroup = (groupId: string) => {
    setActiveGroup(groupId);
  };

  const addApplet = (applet: Applet) => {
    const updatedApplets = [...(config.applets || []), applet];
    setConfig(prev => ({
      ...prev,
      applets: updatedApplets,
      searchConfig: {
        ...prev.searchConfig,
        [applet.id]: []
      }
    }));
    if (!activeApplet) {
      setActiveApplet(applet.id);
    }
  };

  const addGroup = (group: AppletContainersConfig) => {
    if (activeApplet) {
      const updatedSearchConfig = { ...config.searchConfig };
      updatedSearchConfig[activeApplet] = [
        ...(updatedSearchConfig[activeApplet] || []),
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
    if (activeApplet && activeGroup) {
      const updatedSearchConfig = { ...config.searchConfig };
      const groupIndex = updatedSearchConfig[activeApplet].findIndex(g => g.id === activeGroup);
      
      if (groupIndex !== -1) {
        updatedSearchConfig[activeApplet][groupIndex].fields = [
          ...updatedSearchConfig[activeApplet][groupIndex].fields,
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
    <div className="w-full h-full px-4 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <Card className="border-none bg-white dark:bg-gray-900 shadow-lg space-y-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-rose-500">App Configuration Builder</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Create configurations for your your Applet</CardDescription>
          </CardHeader>
          <CardContent>
            <Stepper 
              steps={steps} 
              activeStep={activeStep} 
              onStepClick={(index) => setActiveStep(index)} 
            />
            
            <div className="mt-8">
              {activeStep === 0 && (
                <AppInfoStep 
                  config={config} 
                  updateConfig={updateConfig} 
                />
              )}
              
              {activeStep === 1 && (
                <AppletsConfigStep 
                  applets={config.applets || []} 
                  addApplet={addApplet}
                  updateConfig={updateConfig}
                  activeApplet={activeApplet}
                  setActiveApplet={updateActiveApplet}
                  config={config}
                />
              )}
              
              {activeStep === 2 && (
                <GroupsConfigStep 
                  applets={config.applets || []}
                  searchConfig={config.searchConfig || {}}
                  activeApplet={activeApplet}
                  activeGroup={activeGroup}
                  setActiveApplet={updateActiveApplet}
                  setActiveGroup={updateActiveGroup}
                  addGroup={addGroup}
                />
              )}
              
              {activeStep === 3 && (
                <FieldsConfigStep 
                  searchConfig={config.searchConfig || {}}
                  activeApplet={activeApplet}
                  activeGroup={activeGroup}
                  setActiveApplet={updateActiveApplet}
                  setActiveGroup={updateActiveGroup}
                  addField={addField}
                />
              )}
              
              {activeStep === 4 && (
                <PreviewConfig config={config} />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={activeStep === steps.length - 1}
              className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
            >
              {activeStep === steps.length - 2 ? 'Preview' : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ConfigBuilder;
