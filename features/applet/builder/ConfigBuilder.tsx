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
import { SelectAppStep } from '@/features/applet/builder/components/SelectAppStep';
import { PreviewConfig } from '@/features/applet/builder/previews/PreviewConfig';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { LoadingSpinner } from '@/components/ui/spinner';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import { selectAppById, selectAppLoading, selectAppError } from '@/lib/redux/app-builder/selectors/appSelectors';
import { fetchAppsThunk } from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { addAppletThunk, removeAppletThunk } from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { createAppletThunk, updateAppletThunk } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';

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
} from '@/lib/redux/app-builder/service/customAppService';

import {
  getAllCustomAppletConfigs,
  getCustomAppletConfigById,
  createCustomAppletConfig,
  updateCustomAppletConfig,
  recompileGroupInAppletById,
  recompileAllGroupsInApplet,
  isAppletSlugAvailable
} from '@/lib/redux/app-builder/service/customAppletService';

import {
  getAllComponentGroups,
  getComponentGroupById,
  addFieldToGroup,
  removeFieldFromGroup,
  refreshFieldInGroup,
  refreshAllFieldsInGroup
} from '@/lib/redux/app-builder/service/fieldGroupService';

import {
  getAllFieldComponents,
  getFieldComponentById
} from '@/lib/redux/app-builder/service/fieldComponentService';

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
  layoutType: 'open',
  imageUrl: '',
};

export const ConfigBuilder = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [activeStep, setActiveStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  
  // Redux state
  const appLoading = useAppSelector(selectAppLoading);
  const appError = useAppSelector(selectAppError);
  
  // App configuration state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const selectedApp = useAppSelector(state => 
    selectedAppId ? selectAppById(state, selectedAppId) : null
  );
  const [isCreatingNewApp, setIsCreatingNewApp] = useState(false);
  const [tempNewAppConfig, setTempNewAppConfig] = useState<Partial<CustomAppConfig>>(DEFAULT_APP_CONFIG);
  
  // Applet state
  const [applets, setApplets] = useState<CustomAppletConfig[]>([]);
  const [availableApplets, setAvailableApplets] = useState<CustomAppletConfig[]>([]);
  const [activeApplet, setActiveApplet] = useState<string | null>(null);
  
  // Group state
  const [availableGroups, setAvailableGroups] = useState<ComponentGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  
  // Loading states for specific operations
  const [isLoadingApplets, setIsLoadingApplets] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  
  // When the component mounts, fetch available applets and groups
  useEffect(() => {
    const fetchData = async () => {
      setLoadingMessage('Loading available resources...');
      try {
        // Fetch available applets and groups for selection
        const fetchedApplets = await getAllCustomAppletConfigs();
        const fetchedGroups = await getAllComponentGroups();
        
        setAvailableApplets(fetchedApplets);
        setAvailableGroups(fetchedGroups);
        
        // Also fetch apps via Redux
        dispatch(fetchAppsThunk());
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load initial data. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    
    fetchData();
  }, [toast, dispatch]);
  
  // When app changes, fetch its applets
  useEffect(() => {
    if (selectedApp?.id && selectedApp.appletIds && selectedApp.appletIds.length > 0) {
      const fetchApplets = async () => {
        setIsLoadingApplets(true);
        setLoadingMessage('Loading applets...');
        try {
          console.log('Fetching applets for app:', selectedApp.id, 'appletIds:', selectedApp.appletIds);
          
          const appletsPromises = selectedApp.appletIds.map(async (appletId) => {
            try {
              const applet = await getCustomAppletConfigById(appletId);
              if (!applet) {
                console.warn(`No applet found with ID ${appletId}`);
                return null;
              }
              console.log(`Successfully loaded applet: ${appletId}`);
              return applet;
            } catch (error) {
              console.error(`Error fetching applet ${appletId}:`, error);
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
  }, [selectedApp, toast, activeApplet]);

  const steps = [
    { id: 'select-app', title: 'Select App', description: 'Select an existing app or create a new one' },
    { id: 'app-info', title: 'App Information', description: 'Basic information about your app' },
    { id: 'applets-config', title: 'Add Applets', description: 'Define & Configure Applets' },
    { id: 'groups-config', title: 'Broker Groups', description: 'Create groups of Brokers' },
    { id: 'fields-config', title: 'Broker Fields', description: 'Define fields for each Broker' },
    { id: 'preview', title: 'Preview & Export', description: 'Review and export your configuration' }
  ];

  const handleNext = async () => {
    if (activeStep === 0) {
      // For the first step (Select App), we don't need validation as the user
      // either selects an app (which sets selectedAppId) or creates a new one (moving to step 1)
      if (!selectedAppId && activeStep === 0) {
        // If no app is selected, move to App Info step to create a new one
        setActiveStep(1);
        setIsCreatingNewApp(true);
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      // App Info step - validation is now handled within the AppInfoStep component
      // The AppInfoStep component will call saveApp() which will handle the progression
      setActiveStep(2);
    } else if (activeStep === 2) {
      // Verify we have at least one applet before proceeding
      if (applets.length === 0) {
        toast({
          title: "No Applets Added",
          description: "Please add at least one applet before proceeding.",
          variant: "destructive",
        });
        return;
      }
      setActiveStep(3);
    } else if (activeStep === 3) {
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
      setActiveStep(4);
    } else if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const updateActiveApplet = (appletId: string) => {
    setActiveApplet(appletId);
    setActiveGroup(null);
  };

  const updateActiveGroup = (groupId: string) => {
    setActiveGroup(groupId);
  };

  // Function to update the temporary new app config (when creating a new app)
  const updateTempNewAppConfig = (updates: Partial<CustomAppConfig>) => {
    setTempNewAppConfig(prev => ({ ...prev, ...updates }));
  };

  const addApplet = async (appletConfig: CustomAppletConfig) => {
    // Check if we have a saved app first
    if (!selectedAppId) {
      toast({
        title: "No App Found",
        description: "Please save app information first.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingMessage('Adding applet to app...');
    try {
      // Check if applet is already in the app
      const isAppletInApp = selectedApp?.appletIds?.includes(appletConfig.id as string);
      if (isAppletInApp) {
        toast({
          title: "Applet Already Added",
          description: "This applet is already in your app.",
          variant: "default",
        });
        return;
      }
      
      // Ensure applet has containers array and is associated with this app
      const appletWithContainers = {
        ...appletConfig,
        containers: appletConfig.containers || [],
        appId: selectedAppId
      };
      
      let applet: CustomAppletConfig;
      
      // If this is an existing applet (from the pool of available applets)
      if (appletConfig.id && availableApplets.some(a => a.id === appletConfig.id)) {
        console.log('Adding existing applet with direct API call:', appletConfig.id);
        
        // For existing applets, create a new DB entry using the service directly
        // Let the DB generate a new ID by setting id to null
        const appletData = {
          ...appletWithContainers,
          id: null // Let the DB generate a new ID
        };
        
        // Check slug availability first
        const slugAvailable = await isAppletSlugAvailable(appletConfig.slug);
        if (!slugAvailable) {
          toast({
            title: "Applet Slug Already Used",
            description: "This applet slug is already in use. Please choose another.",
            variant: "destructive",
          });
          throw new Error("Applet slug already in use");
        }
        
        // Create a new applet based on the existing one
        applet = await createCustomAppletConfig(appletData);
      } else {
        // For new applets created in the builder
        console.log('Creating new applet with Redux thunk');
        
        // Check slug availability first
        const slugAvailable = await isAppletSlugAvailable(appletConfig.slug);
        if (!slugAvailable) {
          toast({
            title: "Applet Slug Already Used",
            description: "This applet slug is already in use. Please choose another.",
            variant: "destructive",
          });
          throw new Error("Applet slug already in use");
        }
        
        // Create via Redux
        const createdApplet = await dispatch(createAppletThunk(appletWithContainers as any)).unwrap();
        applet = createdApplet;
      }
      
      console.log('Successfully created applet:', applet);
      
      // Add applet to app in Redux
      await dispatch(addAppletThunk({
        appId: selectedAppId,
        appletId: applet.id as string
      })).unwrap();
      
      // Add the newly added applet to the applets array for local state
      setApplets(prev => {
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
    
    setLoadingMessage('Adding group to applet...');
    try {
      // Get the current applet
      const applet = applets.find(a => a.id === activeApplet);
      if (!applet) throw new Error("Applet not found");
      
      // Add the group to the applet using the RPC function
      const success = await recompileGroupInAppletById(applet.id, group.id);
      
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
    
    setLoadingMessage('Adding field to group...');
    try {
      // Add the field to the group
      const success = await addFieldToGroup(groupId, fieldId);
      
      if (success) {
        // Refresh the field in the group to ensure it's updated
        await refreshFieldInGroup(groupId, fieldId);
        
        // Refresh the group in the applet to update the embedded object
        await recompileGroupInAppletById(activeApplet, groupId);
        
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
    }
  };

  const removeField = async (fieldId: string, groupId: string) => {
    if (!activeApplet || !groupId) return;
    
    setLoadingMessage('Removing field from group...');
    try {
      // Remove the field from the group
      const success = await removeFieldFromGroup(groupId, fieldId);
      
      if (success) {
        // Refresh the group in the applet
        await recompileGroupInAppletById(activeApplet, groupId);
        
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
    }
  };

  // Function to refresh all groups in an applet
  const refreshAppletGroups = async (appletId: string) => {
    if (!appletId) return;
    
    setLoadingMessage('Refreshing applet groups...');
    try {
      const success = await recompileAllGroupsInApplet(appletId);
      
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
    }
  };

  // Function to refresh all fields in a group
  const refreshGroupFields = async (groupId: string, appletId: string) => {
    if (!groupId || !appletId) return;
    
    setLoadingMessage('Refreshing group fields...');
    try {
      // Refresh all fields in the group
      const fieldsSuccess = await refreshAllFieldsInGroup(groupId);
      
      if (fieldsSuccess) {
        // Refresh the group in the applet
        const groupSuccess = await recompileGroupInAppletById(appletId, groupId);
        
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
    }
  };

  const handleAppSelected = (app: CustomAppConfig) => {
    // Set the selected app ID
    setSelectedAppId(app.id);
    setIsCreatingNewApp(false);
    
    toast({
      title: "App Selected",
      description: `You've selected ${app.name} to edit.`,
    });
    
    // Move to the next step (App Info)
    setActiveStep(1);
  };

  const handleCreateNewApp = () => {
    // Reset app state to defaults for a new app
    setSelectedAppId(null);
    setIsCreatingNewApp(true);
    setApplets([]);
    setActiveApplet(null);
    setTempNewAppConfig(DEFAULT_APP_CONFIG);
    
    // Move to App Info step
    setActiveStep(1);
    
    toast({
      title: "Create New App",
      description: "Let's start by entering your app's basic information.",
    });
  };

  // Reset to the app selection step
  const resetToSelectStep = () => {
    setActiveStep(0);
    toast({
      title: "Select Different App",
      description: "You can select a different app or create a new one.",
    });
  };

  // Initial welcome message
  useEffect(() => {
    if (!selectedAppId && !isCreatingNewApp) {
      toast({
        title: "Welcome to App Builder",
        description: "Select an existing app to edit or create a new one.",
      });
    }
  }, [selectedAppId, isCreatingNewApp, toast]);

  const isStepLoading = () => {
    return appLoading || isLoadingApplets || isLoadingGroups;
  };

  // Footer rendering with conditional reset button
  const renderFooter = () => {
    return (
      <CardFooter className="flex justify-between">
        {activeStep > 0 ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isStepLoading()}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Back
            </Button>
            {activeStep > 0 && (
              <Button
                variant="ghost"
                onClick={resetToSelectStep}
                disabled={isStepLoading()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Select Different App
              </Button>
            )}
          </div>
        ) : (
          <div></div> // Empty div to maintain space in flex layout
        )}
        
        <Button
          onClick={handleNext}
          disabled={activeStep === steps.length - 1 || isStepLoading()}
          className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
        >
          {activeStep === steps.length - 2 ? 'Preview' : 'Next'}
        </Button>
      </CardFooter>
    );
  };

  // Handler for when an app is saved (called from AppInfoStep)
  const handleAppSaved = (appId: string) => {
    // Update the selectedAppId if it's a new app
    if (!selectedAppId) {
      setSelectedAppId(appId);
      setIsCreatingNewApp(false);
    }
    
    // Move to the next step
    setActiveStep(2);
  };

  const handleRemoveApplet = async (appletId: string) => {
    if (!selectedAppId) {
      toast({
        title: "No App Selected",
        description: "Cannot remove applet as no app is selected.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingMessage('Removing applet from app...');
    try {
      // Remove applet from app in Redux
      await dispatch(removeAppletThunk({
        appId: selectedAppId,
        appletId
      })).unwrap();
      
      // Remove the applet from local state array
      setApplets(prev => prev.filter(a => a.id !== appletId));
      
      // If the active applet is the one being removed, select another one
      if (activeApplet === appletId) {
        const remainingApplets = applets.filter(a => a.id !== appletId);
        if (remainingApplets.length > 0) {
          setActiveApplet(remainingApplets[0].id as string);
        } else {
          setActiveApplet(null);
        }
      }
      
      toast({
        title: "Applet Removed",
        description: "The applet has been removed from your app.",
      });
    } catch (error) {
      console.error('Error removing applet:', error);
      toast({
        title: "Error",
        description: "Failed to remove applet from app.",
        variant: "destructive",
      });
    }
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
                <SelectAppStep 
                  onAppSelected={handleAppSelected}
                  onCreateNewApp={handleCreateNewApp}
                  selectedApp={selectedApp as CustomAppConfig}
                />
              )}
              
              {activeStep === 1 && (
                <AppInfoStep 
                  config={isCreatingNewApp ? tempNewAppConfig : (selectedApp || {}) as Partial<CustomAppConfig>}
                  updateConfig={isCreatingNewApp ? updateTempNewAppConfig : () => {}} 
                  saveApp={handleAppSaved}
                  isEdit={!isCreatingNewApp && !!selectedAppId}
                />
              )}
              
              {activeStep === 2 && (
                <AppletsConfigStep 
                  appId={selectedAppId}
                />
              )}
              
              {activeStep === 3 && (
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
              
              {activeStep === 4 && (
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
              
              {activeStep === 5 && (
                <PreviewConfig 
                  config={selectedApp as CustomAppConfig} 
                  applets={applets}
                  refreshAppletGroups={refreshAppletGroups}
                  refreshGroupFields={refreshGroupFields}
                />
              )}
            </div>
          </CardContent>
          {renderFooter()}
        </Card>
      </div>
      <Toaster />
    </div>
  );
};

export default ConfigBuilder;
