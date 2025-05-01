'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper } from '@/features/applet/builder/components/Stepper';
import { AppInfoStep } from '@/features/applet/builder/components/AppInfoStep';
import { AppletsConfigStep } from '@/features/applet/builder/components/AppletsConfigStep';
import { GroupsConfigStep } from '@/features/applet/builder/components/GroupsConfigStep';
import { FieldsConfigStep } from '@/features/applet/builder/components/FieldsConfigStep';
import { PreviewConfig } from '@/features/applet/builder/previews/PreviewConfig';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { LoadingSpinner } from '@/components/ui/spinner';

// Import database services
import { 
  CustomAppConfig, 
  CustomAppletConfig,
  ComponentGroup,
  FieldDefinition
} from '@/features/applet/builder/builder.types';

import {
  getAllCustomAppConfigs,
  getCustomAppConfigById,
  createCustomAppConfig,
  updateCustomAppConfig,
  isAppSlugAvailable
} from '@/features/applet/builder/service/customAppService';

import {
  getAllCustomAppletConfigs,
  getCustomAppletConfigById,
  createCustomAppletConfig,
  updateCustomAppletConfig,
  refreshGroupInApplet,
  refreshAllGroupsInApplet,
  isAppletSlugAvailable
} from '@/features/applet/builder/service/customAppletService';

import {
  getAllComponentGroups,
  getComponentGroupById,
  addFieldToGroup,
  removeFieldFromGroup,
  refreshFieldInGroup,
  refreshAllFieldsInGroup
} from '@/features/applet/builder/service/fieldGroupService';

import {
  getAllFieldComponents,
  getFieldComponentById
} from '@/features/applet/builder/service/fieldComponentService';

// Default app configuration values
const DEFAULT_APP_CONFIG: Partial<CustomAppConfig> = {
  name: '',
  description: '',
  slug: '',
  mainAppIcon: 'LayoutTemplate',
  mainAppSubmitIcon: 'Search',
  creator: '',
  primaryColor: 'gray',
  accentColor: 'rose',
  appletList: [],
  extraButtons: [],
  layoutType: 'oneColumn',
  imageUrl: '',
};

export const ConfigBuilder = () => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  
  // App configuration state
  const [appConfig, setAppConfig] = useState<Partial<CustomAppConfig>>(DEFAULT_APP_CONFIG);
  const [savedApp, setSavedApp] = useState<CustomAppConfig | null>(null);
  
  // Applet state
  const [applets, setApplets] = useState<CustomAppletConfig[]>([]);
  const [availableApplets, setAvailableApplets] = useState<CustomAppletConfig[]>([]);
  const [activeApplet, setActiveApplet] = useState<string | null>(null);
  
  // Group state
  const [availableGroups, setAvailableGroups] = useState<ComponentGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  
  // Loading states for specific operations
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [isLoadingApplets, setIsLoadingApplets] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  
  // When the component mounts, fetch available applets and groups
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadingMessage('Loading available resources...');
      try {
        // Fetch available applets and groups for selection
        const fetchedApplets = await getAllCustomAppletConfigs();
        const fetchedGroups = await getAllComponentGroups();
        
        setAvailableApplets(fetchedApplets);
        setAvailableGroups(fetchedGroups);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load initial data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  // When app changes, fetch its applets
  useEffect(() => {
    if (savedApp?.id && savedApp.appletList && savedApp.appletList.length > 0) {
      const fetchApplets = async () => {
        setIsLoadingApplets(true);
        setLoadingMessage('Loading applets...');
        try {
          console.log('Fetching applets for app:', savedApp.id, 'appletList:', savedApp.appletList);
          
          const appletsPromises = savedApp.appletList.map(async (item) => {
            try {
              const applet = await getCustomAppletConfigById(item.appletId);
              if (!applet) {
                console.warn(`No applet found with ID ${item.appletId}`);
                return null;
              }
              console.log(`Successfully loaded applet: ${item.appletId}`);
              return applet;
            } catch (error) {
              console.error(`Error fetching applet ${item.appletId}:`, error);
              return null;
            }
          });
          
          const fetchedApplets = (await Promise.all(appletsPromises))
            .filter((applet): applet is CustomAppletConfig => applet !== null);
          
          console.log('Loaded applets:', fetchedApplets.length, fetchedApplets.map(a => a.id));
          setApplets(fetchedApplets);
          
          // Set the first applet as active if none is selected
          if (fetchedApplets.length > 0 && !activeApplet) {
            setActiveApplet(fetchedApplets[0].id as string);
          }
        } catch (error) {
          console.error('Error fetching applets for app:', error);
          toast({
            title: "Error",
            description: "Failed to load applets. Some data may be missing.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingApplets(false);
        }
      };
      
      fetchApplets();
    } else {
      // Reset applets if no app is selected or no applets in the app
      console.log('No applets to load or no saved app');
      setApplets([]);
      setActiveApplet(null);
    }
  }, [savedApp, toast, activeApplet]);
  
  const steps = [
    { id: 'app-info', title: 'App Information', description: 'Basic information about your app' },
    { id: 'applets-config', title: 'Add Applets', description: 'Define & Configure Applets' },
    { id: 'groups-config', title: 'Broker Groups', description: 'Create groups of Brokers' },
    { id: 'fields-config', title: 'Broker Fields', description: 'Define fields for each Broker' },
    { id: 'preview', title: 'Preview & Export', description: 'Review and export your configuration' }
  ];

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate app info before moving to the next step
      if (!appConfig.name || !appConfig.slug) {
        toast({
          title: "Required Fields Missing",
          description: "Please fill out all required fields before proceeding.",
          variant: "destructive",
        });
        return;
      }
      
      // Save/update the app before moving to applet configuration
      try {
        await handleSaveApp();
      } catch (error) {
        // Error is already handled in handleSaveApp
        return;
      }
    } else if (activeStep === 1) {
      // Verify we have at least one applet before proceeding
      if (applets.length === 0) {
        toast({
          title: "No Applets Added",
          description: "Please add at least one applet before proceeding.",
          variant: "destructive",
        });
        return;
      }
    } else if (activeStep === 2) {
      // Ensure all applets have at least one group
      const hasEmptyApplet = applets.some(applet => !applet.containers || applet.containers.length === 0);
      if (hasEmptyApplet) {
        toast({
          title: "Missing Groups",
          description: "Please ensure all applets have at least one group before proceeding.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSaveApp = async () => {
    if (!appConfig.name || !appConfig.slug) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill out name and slug fields.",
        variant: "destructive",
      });
      throw new Error("Required fields missing");
    }
    
    setIsSavingApp(true);
    setLoadingMessage('Saving app information...');
    try {
      // Check if the slug is available (unless we're updating an existing app)
      if (!savedApp || savedApp.slug !== appConfig.slug) {
        const slugAvailable = await isAppSlugAvailable(
          appConfig.slug, 
          savedApp?.id
        );
        
        if (!slugAvailable) {
          toast({
            title: "Slug Already Used",
            description: "This slug is already in use. Please choose another.",
            variant: "destructive",
          });
          throw new Error("Slug already in use");
        }
      }
      
      if (savedApp?.id) {
        // Update the existing app
        const updatedApp = await updateCustomAppConfig(
          savedApp.id, 
          appConfig as CustomAppConfig
        );
        setSavedApp(updatedApp);
        toast({
          title: "App Updated",
          description: "Your app has been updated successfully.",
        });
      } else {
        // Create a new app
        const newApp = await createCustomAppConfig(appConfig as CustomAppConfig);
        setSavedApp(newApp);
        toast({
          title: "App Created",
          description: "Your app has been created successfully.",
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error saving app:', error);
      toast({
        title: "Error",
        description: "Failed to save app. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSavingApp(false);
    }
  };

  const updateAppConfig = (updates: Partial<CustomAppConfig>) => {
    setAppConfig(prev => ({
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

  const addApplet = async (appletConfig: CustomAppletConfig) => {
    // Check if we have a saved app first
    if (!savedApp?.id) {
      toast({
        title: "No App Found",
        description: "Please save app information first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Adding applet to app...');
    try {
      // Ensure applet has containers array
      const appletWithContainers = {
        ...appletConfig,
        containers: appletConfig.containers || []
      };
      
      // If applet doesn't have an ID, create a new one
      let applet: CustomAppletConfig;
      if (!appletConfig.id) {
        // Check slug availability
        const slugAvailable = await isAppletSlugAvailable(appletConfig.slug);
        if (!slugAvailable) {
          toast({
            title: "Applet Slug Already Used",
            description: "This applet slug is already in use. Please choose another.",
            variant: "destructive",
          });
          throw new Error("Applet slug already in use");
        }
        
        console.log('Creating new applet with data:', JSON.stringify(appletWithContainers, null, 2));
        applet = await createCustomAppletConfig(appletWithContainers);
        console.log('Created new applet:', applet);
      } else {
        console.log('Using existing applet:', appletConfig.id);
        applet = appletConfig;
      }
      
      // Check if applet is already in the app
      const isAppletInApp = appConfig.appletList?.some(item => item.appletId === applet.id);
      if (isAppletInApp) {
        toast({
          title: "Applet Already Added",
          description: "This applet is already in your app.",
          variant: "default",
        });
        return;
      }
      
      // Update the app's appletList
      const updatedAppletList = [
        ...(appConfig.appletList || []),
        { appletId: applet.id as string, label: applet.name }
      ];
      
      // Update app config with new applet
      const updatedAppConfig = {
        ...appConfig,
        appletList: updatedAppletList
      };
      
      // Save to database
      const updatedApp = await updateCustomAppConfig(
        savedApp.id, 
        updatedAppConfig as CustomAppConfig
      );
      
      // Update state
      setAppConfig(updatedAppConfig);
      setSavedApp(updatedApp);
      
      // Add the newly added applet to the applets array
      setApplets(prev => {
        // Log to check if the applet is correctly being added
        console.log('Adding applet to state:', applet);
        // Check if the applet is already in the array to avoid duplicates
        const isAppletAlreadyInArray = prev.some(a => a.id === applet.id);
        if (isAppletAlreadyInArray) {
          return prev;
        }
        return [...prev, applet];
      });
      
      // Set the newly added applet as active
      setActiveApplet(applet.id as string);
      
      toast({
        title: "Applet Added",
        description: `${applet.name} has been added to your app.`,
      });
    } catch (error) {
      console.error('Error adding applet:', error);
      toast({
        title: "Error",
        description: "Failed to add applet to app.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addGroup = async (group: ComponentGroup) => {
    if (!activeApplet) {
      toast({
        title: "No Active Applet",
        description: "Please select an applet first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Adding group to applet...');
    try {
      // Get the current applet
      const applet = applets.find(a => a.id === activeApplet);
      if (!applet) throw new Error("Applet not found");
      
      // Add the group to the applet using the RPC function
      const success = await refreshGroupInApplet(applet.id, group.id);
      
      if (success) {
        // Get the updated applet with the new group container
        const updatedApplet = await getCustomAppletConfigById(applet.id);
        if (!updatedApplet) throw new Error("Failed to fetch updated applet");
        
        // Update the applets list
        setApplets(prev => prev.map(a => 
          a.id === applet.id ? updatedApplet : a
        ));
        
        // Set the new group as active
        setActiveGroup(group.id);
        
        toast({
          title: "Group Added",
          description: `${group.label} has been added to the applet.`,
        });
      } else {
        throw new Error("Failed to add group to applet");
      }
    } catch (error) {
      console.error('Error adding group:', error);
      toast({
        title: "Error",
        description: "Failed to add group to applet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addField = async (fieldId: string, groupId: string) => {
    if (!activeApplet || !groupId) {
      toast({
        title: "Selection Required",
        description: "Please select an applet and group first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Adding field to group...');
    try {
      // Add the field to the group
      const success = await addFieldToGroup(groupId, fieldId);
      
      if (success) {
        // Refresh the field in the group to ensure it's updated
        await refreshFieldInGroup(groupId, fieldId);
        
        // Refresh the group in the applet to update the embedded object
        await refreshGroupInApplet(activeApplet, groupId);
        
        // Get the updated applet with the refreshed group
        const updatedApplet = await getCustomAppletConfigById(activeApplet);
        if (!updatedApplet) throw new Error("Failed to fetch updated applet");
        
        // Update the applets list
        setApplets(prev => prev.map(a => 
          a.id === activeApplet ? updatedApplet : a
        ));
        
        toast({
          title: "Field Added",
          description: "The field has been added to the group.",
        });
      } else {
        throw new Error("Failed to add field to group");
      }
    } catch (error) {
      console.error('Error adding field:', error);
      toast({
        title: "Error",
        description: "Failed to add field to group.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeField = async (fieldId: string, groupId: string) => {
    if (!activeApplet || !groupId) return;
    
    setIsLoading(true);
    setLoadingMessage('Removing field from group...');
    try {
      // Remove the field from the group
      const success = await removeFieldFromGroup(groupId, fieldId);
      
      if (success) {
        // Refresh the group in the applet
        await refreshGroupInApplet(activeApplet, groupId);
        
        // Get the updated applet
        const updatedApplet = await getCustomAppletConfigById(activeApplet);
        if (!updatedApplet) throw new Error("Failed to fetch updated applet");
        
        // Update the applets list
        setApplets(prev => prev.map(a => 
          a.id === activeApplet ? updatedApplet : a
        ));
        
        toast({
          title: "Field Removed",
          description: "The field has been removed from the group.",
        });
      } else {
        throw new Error("Failed to remove field from group");
      }
    } catch (error) {
      console.error('Error removing field:', error);
      toast({
        title: "Error",
        description: "Failed to remove field from group.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh all groups in an applet
  const refreshAppletGroups = async (appletId: string) => {
    if (!appletId) return;
    
    setIsLoading(true);
    setLoadingMessage('Refreshing applet groups...');
    try {
      const success = await refreshAllGroupsInApplet(appletId);
      
      if (success) {
        // Get the updated applet
        const updatedApplet = await getCustomAppletConfigById(appletId);
        if (!updatedApplet) throw new Error("Failed to fetch updated applet");
        
        // Update the applets list
        setApplets(prev => prev.map(a => 
          a.id === appletId ? updatedApplet : a
        ));
        
        toast({
          title: "Groups Refreshed",
          description: "All groups have been refreshed in the applet.",
        });
      } else {
        throw new Error("Failed to refresh applet groups");
      }
    } catch (error) {
      console.error('Error refreshing applet groups:', error);
      toast({
        title: "Error",
        description: "Failed to refresh applet groups.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh all fields in a group
  const refreshGroupFields = async (groupId: string, appletId: string) => {
    if (!groupId || !appletId) return;
    
    setIsLoading(true);
    setLoadingMessage('Refreshing group fields...');
    try {
      // Refresh all fields in the group
      const fieldsSuccess = await refreshAllFieldsInGroup(groupId);
      
      if (fieldsSuccess) {
        // Refresh the group in the applet
        const groupSuccess = await refreshGroupInApplet(appletId, groupId);
        
        if (groupSuccess) {
          // Get the updated applet
          const updatedApplet = await getCustomAppletConfigById(appletId);
          if (!updatedApplet) throw new Error("Failed to fetch updated applet");
          
          // Update the applets list
          setApplets(prev => prev.map(a => 
            a.id === appletId ? updatedApplet : a
          ));
          
          toast({
            title: "Fields Refreshed",
            description: "All fields have been refreshed in the group.",
          });
        } else {
          throw new Error("Failed to refresh group in applet");
        }
      } else {
        throw new Error("Failed to refresh fields in group");
      }
    } catch (error) {
      console.error('Error refreshing group fields:', error);
      toast({
        title: "Error",
        description: "Failed to refresh group fields.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepLoading = () => {
    return isLoading || isSavingApp || isLoadingApplets || isLoadingGroups;
  };

  return (
    <div className="w-full h-full px-4 bg-white dark:bg-gray-900">
      <div className="w-full max-w-[1600px] mx-auto">
        <Card className="border-none bg-white dark:bg-gray-900 shadow-lg space-y-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-rose-500">App Configuration Builder</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Create configurations for your Applet</CardDescription>
          </CardHeader>
          <CardContent>
            <Stepper 
              steps={steps} 
              activeStep={activeStep} 
              onStepClick={(index) => {
                // Only allow clicking on completed steps or the next step
                if (index <= activeStep || index <= steps.findIndex(s => s.id === 'preview')) {
                  setActiveStep(index);
                }
              }} 
            />
            
            <div className="mt-8 relative">
              {isStepLoading() && (
                <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex flex-col items-center justify-center z-10">
                  <LoadingSpinner size="lg" />
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{loadingMessage}</p>
                </div>
              )}
              
              {activeStep === 0 && (
                <AppInfoStep 
                  config={appConfig} 
                  updateConfig={updateAppConfig}
                  saveApp={handleSaveApp}
                  isEdit={!!savedApp?.id}
                />
              )}
              
              {activeStep === 1 && (
                <AppletsConfigStep 
                  applets={applets}
                  availableApplets={availableApplets}
                  addApplet={addApplet}
                  updateConfig={updateAppConfig}
                  activeApplet={activeApplet}
                  setActiveApplet={updateActiveApplet}
                  config={appConfig}
                  savedApp={savedApp}
                />
              )}
              
              {activeStep === 2 && (
                <GroupsConfigStep 
                  applets={applets}
                  availableGroups={availableGroups}
                  activeApplet={activeApplet}
                  activeGroup={activeGroup}
                  setActiveApplet={updateActiveApplet}
                  setActiveGroup={updateActiveGroup}
                  addGroup={addGroup}
                />
              )}
              
              {activeStep === 3 && (
                <FieldsConfigStep 
                  applets={applets}
                  activeApplet={activeApplet}
                  activeGroup={activeGroup}
                  setActiveApplet={updateActiveApplet}
                  setActiveGroup={updateActiveGroup}
                  addField={addField}
                  removeField={removeField}
                />
              )}
              
              {activeStep === 4 && (
                <PreviewConfig 
                  config={savedApp} 
                  applets={applets}
                  refreshAppletGroups={refreshAppletGroups}
                  refreshGroupFields={refreshGroupFields}
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0 || isStepLoading()}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={activeStep === steps.length - 1 || isStepLoading()}
              className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
            >
              {activeStep === steps.length - 2 ? 'Preview' : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Toaster />
    </div>
  );
};

export default ConfigBuilder;
