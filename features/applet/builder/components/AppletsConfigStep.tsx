'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, XIcon, LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CustomAppConfig, CustomAppletConfig } from '@/features/applet/builder/builder.types';
import { SingleImageSelect } from '@/components/image/shared/SingleImageSelect';
import AppletPreviewCard from '@/features/applet/builder/previews/AppletPreviewCard';


interface AppletsConfigStepProps {
  applets: CustomAppletConfig[];
  availableApplets: CustomAppletConfig[];
  addApplet: (applet: CustomAppletConfig) => void;
  updateConfig: (updates: Partial<CustomAppConfig>) => void;
  activeApplet: string | null;
  setActiveApplet: (appletId: string) => void;
  config: Partial<CustomAppConfig>;
  savedApp: CustomAppConfig | null;
}

export const AppletsConfigStep: React.FC<AppletsConfigStepProps> = ({
  applets,
  availableApplets,
  addApplet,
  updateConfig,
  activeApplet,
  setActiveApplet,
  config,
  savedApp
}) => {
  const [newApplet, setNewApplet] = useState<Partial<CustomAppletConfig>>({
    id: uuidv4(),
    name: '',
    description: '',
    creator: '',
    imageUrl: ''
  });
  
  const [activeAppletObj, setActiveAppletObj] = useState<CustomAppletConfig | null>(null);
  const [slugError, setSlugError] = useState('');
  const [showExistingApplets, setShowExistingApplets] = useState(false);

  // Update the active applet object when activeApplet ID changes
  useEffect(() => {
    if (activeApplet && applets.length > 0) {
      const applet = applets.find(a => a.id === activeApplet);
      if (applet) {
        setActiveAppletObj(applet);
      }
    } else {
      setActiveAppletObj(null);
    }
  }, [activeApplet, applets]);

  const validateSlug = (slug: string): boolean => {
    const slugRegex = /^[a-z0-9\-]+$/;
    return slugRegex.test(slug);
  };

  const handleAddApplet = () => {
    if (newApplet.name && newApplet.slug && validateSlug(newApplet.slug)) {
      // Create a proper CustomAppletConfig with all required fields
      const appletToAdd: CustomAppletConfig = {
        id: newApplet.id || uuidv4(),
        name: newApplet.name,
        description: newApplet.description || '',
        slug: newApplet.slug,
        creator: newApplet.creator || '',
        imageUrl: newApplet.imageUrl || '',
        primaryColor: 'emerald',
        accentColor: 'blue',
        layoutType: 'flat',
        containers: [] // Initialize with empty array
      };
      
      addApplet(appletToAdd);
      
      setNewApplet({
        id: uuidv4(),
        name: '',
        description: '',
        creator: '',
        imageUrl: '',
        slug: ''
      });
      setSlugError('');
    }
  };

  const handleSelectExistingApplet = (appletId: string) => {
    const selectedApplet = availableApplets.find(a => a.id === appletId);
    if (selectedApplet) {
      // Ensure the selected applet has a containers array
      const appletToAdd: CustomAppletConfig = {
        ...selectedApplet,
        containers: selectedApplet.containers || []
      };
      addApplet(appletToAdd);
      setShowExistingApplets(false);
    }
  };

  const handleRemoveApplet = (appletId: string) => {
    // Update the appletList in the app config
    if (config.appletList) {
      const updatedAppletList = config.appletList.filter(a => a.appletId !== appletId);
      updateConfig({ appletList: updatedAppletList });
    }
    
    if (activeApplet === appletId && applets.length > 0) {
      const remainingApplets = applets.filter(a => a.id !== appletId);
      if (remainingApplets.length > 0) {
        setActiveApplet(remainingApplets[0].id);
      } else {
        setActiveApplet('');
      }
    }
  };

  const handleActiveAppletChange = (field: string, value: string) => {
    if (!activeAppletObj) return;
    
    if (field === 'slug' && !validateSlug(value)) {
      setSlugError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    } else {
      setSlugError('');
    }
    
    // Create an updated applet
    const updatedApplet = {
      ...activeAppletObj,
      [field]: value
    };
    
    // If we've updated the name of an applet, also update its reference in the appletList
    if (field === 'name' && config.appletList) {
      const updatedAppletList = config.appletList.map(item => 
        item.appletId === activeAppletObj.id 
          ? { ...item, label: value } 
          : item
      );
      updateConfig({ appletList: updatedAppletList });
    }
  };

  const handleImageSelected = (imageUrl: string) => {
    if (activeAppletObj) {
      const updatedApplet = {
        ...activeAppletObj,
        imageUrl
      };
    } else {
      setNewApplet(prev => ({
        ...prev,
        imageUrl
      }));
    }
  };
  
  const handleImageRemoved = () => {
    if (activeAppletObj) {
      const updatedApplet = {
        ...activeAppletObj,
        imageUrl: ''
      };
    } else {
      setNewApplet(prev => ({
        ...prev,
        imageUrl: ''
      }));
    }
  };

  const handleNewAppletChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'slug') {
      if (!validateSlug(value) && value !== '') {
        setSlugError('Slug can only contain lowercase letters, numbers, and hyphens');
      } else {
        setSlugError('');
      }
    }
    
    setNewApplet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, ''); // Remove special characters
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    
    setNewApplet(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  // Get applet URL for display
  const getAppletUrl = (appName: string = config.name || '', slug: string = ''): string => {
    const appNameSlug = generateSlug(appName);
    return `aimatrx.com/applets/${appNameSlug}/${slug}`;
  };

  // Filter out applets that are already in the app
  const filteredAvailableApplets = availableApplets.filter(
    availableApplet => !applets.some(applet => applet.id === availableApplet.id)
  );

  return (
    <div className="w-full">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-6">
        {/* Header Section */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-rose-500 font-medium text-lg">Applets Configuration</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Add some basic information about your applet. These will give you 'buckets' where you can add Recipes, Agents, and Workflows.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row">
          {/* Left side: Form or Edit area */}
          <div className="w-full md:w-2/3 p-5">
            {activeAppletObj ? (
              /* Edit existing applet */
              <div className="space-y-5">
                <h3 className="text-gray-900 dark:text-gray-100 font-medium">Edit Applet: {activeAppletObj.name}</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Form section */}
                  <div className="w-full md:w-2/3 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Name
                      </Label>
                      <Input
                        id="edit-name"
                        value={activeAppletObj.name}
                        onChange={(e) => handleActiveAppletChange('name', e.target.value)}
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-creator" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Creator Name
                      </Label>
                      <Input
                        id="edit-creator"
                        value={activeAppletObj.creator || ''}
                        onChange={(e) => handleActiveAppletChange('creator', e.target.value)}
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Slug
                      </Label>
                      <Input
                        id="edit-slug"
                        value={activeAppletObj.slug || ''}
                        onChange={(e) => handleActiveAppletChange('slug', e.target.value)}
                        className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${
                          slugError ? 'border-red-500' : ''
                        }`}
                      />
                      {slugError && <p className="text-red-500 text-xs">{slugError}</p>}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <LinkIcon size={12} className="mr-1" />
                        {getAppletUrl(config.name, activeAppletObj.slug)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="edit-description"
                        value={activeAppletObj.description || ''}
                        onChange={(e) => handleActiveAppletChange('description', e.target.value)}
                        rows={3}
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                  </div>
                  
                  {/* Image section */}
                  <div className="w-full md:w-1/3 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Image
                      </Label>
                      <SingleImageSelect
                        size="sm"
                        aspectRatio="landscape"
                        placeholder="Select Applet Image"
                        onImageSelected={handleImageSelected}
                        onImageRemoved={handleImageRemoved}
                        initialTab="public-search"
                        initialSearchTerm={activeAppletObj.name}
                        preselectedImageUrl={activeAppletObj.imageUrl}
                        className="w-full"
                        instanceId={`applet-image-${activeAppletObj.id}`}
                        saveTo="public"
                      />
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemoveApplet(activeAppletObj.id)}
                      className="w-full mt-2"
                    >
                      <XIcon size={16} className="mr-2" />
                      Remove Applet
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create new applet form */
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium">Add New Applet</h3>
                  
                  {filteredAvailableApplets.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowExistingApplets(!showExistingApplets)}
                      className="border-rose-300 dark:border-rose-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      {showExistingApplets ? 'Create New' : 'Use Existing Applet'}
                    </Button>
                  )}
                </div>
                
                {showExistingApplets ? (
                  /* Existing applets selection */
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Select an existing applet to add to this app:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAvailableApplets.map(applet => (
                        <div 
                          key={applet.id} 
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-rose-300 dark:hover:border-rose-700 cursor-pointer"
                          onClick={() => handleSelectExistingApplet(applet.id)}
                        >
                          <div className="flex items-start gap-3">
                            {applet.imageUrl ? (
                              <img 
                                src={applet.imageUrl} 
                                alt={applet.name} 
                                className="w-12 h-12 object-cover rounded" 
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                <PlusIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{applet.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {applet.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* New applet creation form */
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Form section */}
                    <div className="w-full md:w-2/3 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Applet Name
                        </Label>
                        <Input
                          id="new-name"
                          name="name"
                          value={newApplet.name}
                          onChange={handleNameChange}
                          placeholder="Enter applet name"
                          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-creator" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Creator Name
                        </Label>
                        <Input
                          id="new-creator"
                          name="creator"
                          value={newApplet.creator || ''}
                          onChange={handleNewAppletChange}
                          placeholder="Enter creator name"
                          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Applet Slug
                        </Label>
                        <Input
                          id="new-slug"
                          name="slug"
                          value={newApplet.slug || ''}
                          onChange={handleNewAppletChange}
                          placeholder="Enter applet slug"
                          className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${
                            slugError ? 'border-red-500' : ''
                          }`}
                        />
                        {slugError && <p className="text-red-500 text-xs">{slugError}</p>}
                        {newApplet.slug && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <LinkIcon size={12} className="mr-1" />
                            {getAppletUrl(config.name, newApplet.slug)}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Description
                        </Label>
                        <Textarea
                          id="new-description"
                          name="description"
                          value={newApplet.description || ''}
                          onChange={handleNewAppletChange}
                          placeholder="Enter applet description"
                          rows={3}
                          className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                      </div>
                    </div>
                    
                    {/* Image section */}
                    <div className="w-full md:w-1/3 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Applet Image
                        </Label>
                        <SingleImageSelect
                          size="sm"
                          aspectRatio="landscape"
                          placeholder="Select Applet Image"
                          onImageSelected={handleImageSelected}
                          onImageRemoved={handleImageRemoved}
                          initialTab="public-search"
                          initialSearchTerm={newApplet.name}
                          preselectedImageUrl={newApplet.imageUrl}
                          className="w-full"
                          instanceId="new-applet-image"
                          saveTo="public"
                        />
                      </div>
                      
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white"
                        onClick={handleAddApplet}
                        disabled={!newApplet.name || !newApplet.slug || !validateSlug(newApplet.slug || '')}
                      >
                        <PlusIcon size={16} className="mr-2" />
                        Add Applet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right side: Applet list  THIS IS NOT WORKING AND NEEDS TO BE UPDATED TO USE THE APPLET MULTI-SELECT AND THEN SAVE AN ARRAY OF OBJECTS WITH THE APPLET ID AND THE APPLET NAME*/}
          <div className="w-full md:w-1/3 p-5 bg-gray-50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-4">Applets ({applets.length})</h3>
            
            {applets.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <PlusIcon className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600" />
                <p className="mt-2 text-gray-500 dark:text-gray-400">No applets added yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Fill out the form to add your first applet
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {applets.map(applet => (
                  <div
                    key={applet.id}
                    onClick={() => setActiveApplet(applet.id)}
                    className={`cursor-pointer transition-all ${
                      activeApplet === applet.id ? 'ring-2 ring-rose-500' : 'hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <AppletPreviewCard applet={applet} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppletsConfigStep; 