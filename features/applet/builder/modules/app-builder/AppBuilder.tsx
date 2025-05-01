'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, SaveIcon, CheckIcon, AppWindowIcon, TrashIcon, PaletteIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { 
  getAllCustomAppConfigs, 
  getCustomAppConfigById, 
  createCustomAppConfig, 
  updateCustomAppConfig,
  deleteCustomAppConfig,
  isAppSlugAvailable
} from '@/features/applet/builder/service/customAppService';
import { getAppIconOptions, COLOR_VARIANTS } from '@/features/applet/layouts/helpers/StyledComponents';
import { appletLayoutOptionsArray } from '@/features/applet/layouts/options/layout-options';
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { TailwindColorPicker } from '@/components/ui/TailwindColorPicker';
import { IconPicker } from '@/components/ui/IconPicker';

export type CustomAppConfig = {
  id?: string;
  name: string;
  description: string;
  slug: string;
  mainAppIcon?: string;
  mainAppSubmitIcon?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  appletList?: { appletId: string; label: string }[];
  extraButtons?: {
    label: string;
    actionType: string;
    knownMethod: string;
  }[];
  layoutType?: string;
  imageUrl?: string;
}

// SINGLE SOURCE OF TRUTH FOR DEFAULT VALUES
export const DEFAULT_APP_CONFIG: CustomAppConfig = {
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

export const AppBuilder = () => {
  const { toast } = useToast();
  // Use the DEFAULT_APP_CONFIG as the initial state
  const [newApp, setNewApp] = useState<Partial<CustomAppConfig>>({ ...DEFAULT_APP_CONFIG });
  const [savedApps, setSavedApps] = useState<CustomAppConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedApp, setSelectedApp] = useState<CustomAppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize the available icons using the utility from StyledComponents
  const availableIcons = useMemo(() => {
    return getAppIconOptions();
  }, []);

  // Memoize the filtered icons based on search term
  const filteredIcons = useMemo(() => {
    if (!searchTerm) return availableIcons;
    return availableIcons.filter(icon => 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableIcons, searchTerm]);

  useEffect(() => {
    const loadApps = async () => {
      setIsLoading(true);
      try {
        const apps = await getAllCustomAppConfigs();
        setSavedApps(apps);
      } catch (error) {
        console.error('Failed to load apps:', error);
        toast({
          title: "Error",
          description: "Failed to load apps",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadApps();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApp(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // Convert camelCase or any case to kebab-case
    const slug = name.toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, ''); // Remove special characters
    
    setNewApp(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewApp(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIconSelect = (iconType: 'appIcon' | 'submitIcon', iconName: string) => {
    if (iconType === 'appIcon') {
      setNewApp(prev => ({
        ...prev,
        mainAppIcon: iconName
      }));
    } else {
      setNewApp(prev => ({
        ...prev,
        mainAppSubmitIcon: iconName
      }));
    }
  };

  const resetForm = () => {
    // Use the DEFAULT_APP_CONFIG for resetting the form
    setNewApp({ ...DEFAULT_APP_CONFIG });
    setSelectedApp(null);
  };

  const saveApp = async () => {
    if (!newApp.name || !newApp.slug) {
      toast({
        title: "Validation Error",
        description: "App name and slug are required",
        variant: "destructive",
      });
      return;
    }
    // Check slug uniqueness before saving
    setIsLoading(true);
    try {
      const isAvailable = await isAppSlugAvailable(newApp.slug);
      
      if (!isAvailable) {
        toast({
          title: "Slug Error",
          description: `The slug "${newApp.slug}" is already in use. Please choose a different one.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const createdApp = await createCustomAppConfig(newApp as CustomAppConfig);
      setSavedApps(prev => [...prev, createdApp]);
      toast({
        title: "App Saved",
        description: `App "${newApp.name}" has been saved successfully.`,
      });
      resetForm();
    } catch (error) {
      console.error('Error saving app:', error);
      toast({
        title: "Error",
        description: "Failed to save app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editApp = (app: CustomAppConfig) => {
    // Ensure all fields are properly set with defaults from DEFAULT_APP_CONFIG if missing
    const appWithDefaults = {
      ...DEFAULT_APP_CONFIG,
      ...app
    };
    
    setSelectedApp(app);
    setNewApp(appWithDefaults);
    setActiveTab('create');
  };

  const updateApp = async () => {
    if (!selectedApp?.id) return;
    
    setIsLoading(true);
    try {
      // Check slug uniqueness only if the slug has changed
      if (selectedApp.slug !== newApp.slug) {
        const isAvailable = await isAppSlugAvailable(newApp.slug, selectedApp.id);
        
        if (!isAvailable) {
          toast({
            title: "Slug Error",
            description: `The slug "${newApp.slug}" is already in use. Please choose a different one.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      const updatedApp = await updateCustomAppConfig(selectedApp.id, newApp as CustomAppConfig);
      setSavedApps(prev => prev.map(app => 
        app.id === selectedApp.id ? updatedApp : app
      ));
      
      toast({
        title: "App Updated",
        description: `App "${newApp.name}" has been updated successfully.`,
      });
      resetForm();
    } catch (error) {
      console.error('Error updating app:', error);
      toast({
        title: "Error",
        description: "Failed to update app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApp = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteCustomAppConfig(id);
      setSavedApps(prev => prev.filter(app => app.id !== id));
      toast({
        title: "App Deleted",
        description: "App has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting app:', error);
      toast({
        title: "Error",
        description: "Failed to delete app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelected = (imageUrl: string) => {
    setNewApp(prev => ({
      ...prev,
      imageUrl
    }));
  };

  // Handle image removal from SingleImageSelect
  const handleImageRemoved = () => {
    setNewApp(prev => ({
      ...prev,
      imageUrl: ''
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-500 dark:text-blue-400">App Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage custom apps
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                Create App
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                Saved Apps ({savedApps.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">
                        App Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={newApp.name || ''}
                        onChange={handleNameChange}
                        placeholder="Enter app name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-gray-900 dark:text-gray-100">
                        Slug
                      </Label>
                      <Input
                        id="slug"
                        name="slug"
                        value={newApp.slug || ''}
                        onChange={handleInputChange}
                        placeholder="Enter slug"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-generated from name, but can be customized
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={newApp.description || ''}
                        onChange={handleInputChange}
                        placeholder="Enter app description"
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creator" className="text-gray-900 dark:text-gray-100">
                        Creator
                      </Label>
                      <Input
                        id="creator"
                        name="creator"
                        value={newApp.creator || ''}
                        onChange={handleInputChange}
                        placeholder="Enter creator name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-900 dark:text-gray-100">
                          Main App Icon
                        </Label>
                        <div className="flex justify-center">
                          <IconPicker
                            selectedIcon={newApp.mainAppIcon}
                            onIconSelect={(iconName) => handleIconSelect('appIcon', iconName)}
                            dialogTitle="Select Main App Icon"
                            dialogDescription="Choose an icon to represent your app"
                            className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg"
                            defaultIcon={DEFAULT_APP_CONFIG.mainAppIcon}
                            primaryColor={newApp.primaryColor}
                            accentColor={newApp.accentColor}
                            iconType="appIcon"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-900 dark:text-gray-100">
                          Submit Icon
                        </Label>
                        <div className="flex justify-center">
                          <IconPicker
                            selectedIcon={newApp.mainAppSubmitIcon}
                            onIconSelect={(iconName) => handleIconSelect('submitIcon', iconName)}
                            dialogTitle="Select Submit Icon"
                            dialogDescription="Choose an icon for the submit action"
                            className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg"
                            defaultIcon={DEFAULT_APP_CONFIG.mainAppSubmitIcon}
                            primaryColor={newApp.primaryColor}
                            accentColor={newApp.accentColor}
                            iconType="submitIcon"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor" className="text-gray-900 dark:text-gray-100">
                          Primary Background Color
                        </Label>
                        <TailwindColorPicker
                          selectedColor={newApp.primaryColor ?? DEFAULT_APP_CONFIG.primaryColor}
                          onColorChange={(color) => handleSelectChange('primaryColor', color)}
                          size="md"
                          customSize={64}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accentColor" className="text-gray-900 dark:text-gray-100">
                          Accent Color
                        </Label>
                        <TailwindColorPicker
                          selectedColor={newApp.accentColor ?? DEFAULT_APP_CONFIG.accentColor}
                          onColorChange={(color) => handleSelectChange('accentColor', color)}
                          size="md"
                          customSize={64}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="layoutType" className="text-gray-900 dark:text-gray-100">
                        Layout Type
                      </Label>
                      <Select
                        value={newApp.layoutType ?? DEFAULT_APP_CONFIG.layoutType}
                        onValueChange={(value) => handleSelectChange('layoutType', value)}
                      >
                        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select a layout" />
                        </SelectTrigger>
                        <SelectContent>
                          {appletLayoutOptionsArray.map(layout => (
                            <SelectItem key={layout.value} value={layout.value} className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 dark:text-gray-300">{layout.icon}</span>
                                <span>{layout.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-gray-900 dark:text-gray-100">
                        App Banner
                      </Label>
                      <SingleImageSelect 
                        size="md"
                        aspectRatio="landscape"
                        placeholder="Select App Banner"
                        onImageSelected={handleImageSelected}
                        onImageRemoved={handleImageRemoved}
                        initialTab="public-search"
                        initialSearchTerm={newApp.name}
                        preselectedImageUrl={newApp.imageUrl}
                        className="w-full max-w-full"
                        instanceId="app-banner"
                        saveTo="public"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    Reset
                  </Button>
                  
                  <Button
                    onClick={selectedApp ? updateApp : saveApp}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      'Processing...'
                    ) : selectedApp ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update App</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save App</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Loading apps...</p>
                </div>
              ) : savedApps.length === 0 ? (
                <div className="text-center py-8">
                  <AppWindowIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No apps</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new app
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New App
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedApps.map(app => (
                    <Card key={app.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                      {/* Add image banner at the top if available */}
                      {app.imageUrl && (
                        <div className="h-32 w-full relative">
                          <img 
                            src={app.imageUrl} 
                            alt={app.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <IconPicker
                              selectedIcon={app.mainAppIcon}
                              onIconSelect={() => {}} // Read-only in this context
                              className="w-5 h-5"
                              defaultIcon={app.mainAppIcon}
                              accentColor={app.accentColor}
                              iconType="appIcon"
                            />
                          </div>
                          <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {app.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {app.slug}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {app.description && (
                            <p className="mb-2 truncate">{app.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <p>
                              <span className="font-medium">Layout:</span> 
                              <span className="ml-1 flex items-center gap-1">
                                {appletLayoutOptionsArray.find(l => l.value === app.layoutType)?.icon}
                                <span>{appletLayoutOptionsArray.find(l => l.value === app.layoutType)?.title || app.layoutType || DEFAULT_APP_CONFIG.layoutType}</span>
                              </span>
                            </p>
                            <p><span className="font-medium">Created By:</span> {app.creator || 'Unknown'}</p>
                            <p>
                              <span className="font-medium">Primary:</span> 
                              <span className="flex items-center gap-1 ml-1">
                                <span className={`inline-block w-3 h-3 rounded-full bg-${app.primaryColor || DEFAULT_APP_CONFIG.primaryColor}-500`}></span>
                                <span className="capitalize">{app.primaryColor || DEFAULT_APP_CONFIG.primaryColor}</span>
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">Accent:</span> 
                              <span className="flex items-center gap-1 ml-1">
                                <span className={`inline-block w-3 h-3 rounded-full bg-${app.accentColor || DEFAULT_APP_CONFIG.accentColor}-500`}></span>
                                <span className="capitalize">{app.accentColor || DEFAULT_APP_CONFIG.accentColor}</span>
                              </span>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteApp(app.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editApp(app)}
                          disabled={isLoading}
                          className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Toaster />
    </div>
  );
};

export default AppBuilder;