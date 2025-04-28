'use client';


import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, XIcon, LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AppConfig, Applet } from '@/features/applet/builder/ConfigBuilder';
import { SingleImageSelect } from '@/components/image/shared/SingleImageSelect';
import AppletPreviewCard from '@/features/applet/builder/previews/AppletPreviewCard';

interface AppletsConfigStepProps {
  applets: Applet[];
  addApplet: (applet: Applet) => void;
  updateConfig: (updates: Partial<AppConfig>) => void;
  activeApplet: string | null;
  setActiveApplet: (appletId: string) => void;
  config: Partial<AppConfig>;
}

export const AppletsConfigStep: React.FC<AppletsConfigStepProps> = ({
  applets,
  addApplet,
  updateConfig,
  activeApplet,
  setActiveApplet,
  config
}) => {
  const [newApplet, setNewApplet] = useState<Partial<Applet>>({
    id: uuidv4(),
    name: '',
    description: '',
    creatorName: '',
    imageUrl: ''
  });
  
  const [activeAppletObj, setActiveAppletObj] = useState<Applet | null>(null);
  const [slugError, setSlugError] = useState('');

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
    if (newApplet.name && validateSlug(newApplet.slug || '')) {
      addApplet({
        id: newApplet.id || uuidv4(),
        name: newApplet.name,
        description: newApplet.description || '',
        creatorName: newApplet.creatorName || '',
        imageUrl: newApplet.imageUrl || '',
        slug: newApplet.slug || generateSlug(newApplet.name)
      } as Applet);
      
      setNewApplet({
        id: uuidv4(),
        name: '',
        description: '',
        creatorName: '',
        imageUrl: '',
        slug: ''
      });
      setSlugError('');
    }
  };

  const handleRemoveApplet = (appletId: string) => {
    const updatedApplets = applets.filter(applet => applet.id !== appletId);
    
    const updatedSearchConfig = { ...config.searchConfig || {} };
    if (updatedSearchConfig) {
      const { [appletId]: _, ...rest } = updatedSearchConfig;
      
      updateConfig({
        applets: updatedApplets,
        searchConfig: rest
      });
    }
    
    if (activeApplet === appletId && updatedApplets.length > 0) {
      setActiveApplet(updatedApplets[0].id);
    } else if (updatedApplets.length === 0) {
      setActiveApplet('');
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
    
    const updatedApplets = applets.map(applet => 
      applet.id === activeAppletObj.id 
        ? { ...applet, [field]: value } 
        : applet
    );
    
    updateConfig({ applets: updatedApplets });
  };

  const handleImageSelected = (imageUrl: string) => {
    if (activeAppletObj) {
      const updatedApplets = applets.map(applet => 
        applet.id === activeAppletObj.id 
          ? { ...applet, imageUrl } 
          : applet
      );
      
      updateConfig({ applets: updatedApplets });
    } else {
      setNewApplet(prev => ({
        ...prev,
        imageUrl
      }));
    }
  };
  
  const handleImageRemoved = () => {
    if (activeAppletObj) {
      const updatedApplets = applets.map(applet => 
        applet.id === activeAppletObj.id 
          ? { ...applet, imageUrl: '' } 
          : applet
      );
      
      updateConfig({ applets: updatedApplets });
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
    return name.toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewApplet(prev => ({
      ...prev,
      name
    }));
    
    // Auto-generate slug from name if slug is empty
    if (!newApplet.slug) {
      setNewApplet(prev => ({
        ...prev,
        slug: generateSlug(name)
      }));
    }
  };

  // Get applet URL for display
  const getAppletUrl = (appName: string = config.name || '', slug: string = ''): string => {
    const appNameSlug = generateSlug(appName);
    return `aimatrx.com/applets/${appNameSlug}/${slug}`;
  };

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
                      <Label htmlFor="edit-creatorName" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Creator Name
                      </Label>
                      <Input
                        id="edit-creatorName"
                        value={activeAppletObj.creatorName || ''}
                        onChange={(e) => handleActiveAppletChange('creatorName', e.target.value)}
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet URL Slug
                      </Label>
                      <div className="relative">
                        <Input
                          id="edit-slug"
                          value={activeAppletObj.slug || ''}
                          onChange={(e) => handleActiveAppletChange('slug', e.target.value)}
                          className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${slugError ? 'border-red-300 dark:border-red-700' : ''}`}
                        />
                        <div className="flex items-center mt-1.5">
                          <LinkIcon className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getAppletUrl(config.name, activeAppletObj.slug)}
                          </span>
                        </div>
                        {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="edit-description"
                        value={activeAppletObj.description}
                        onChange={(e) => handleActiveAppletChange('description', e.target.value)}
                        rows={4}
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Image
                      </Label>
                      <div className="w-full">
                        <SingleImageSelect 
                          size="md"
                          aspectRatio="landscape"
                          placeholder="Select Applet Image"
                          onImageSelected={handleImageSelected}
                          onImageRemoved={handleImageRemoved}
                          initialTab="public-search"
                          initialSearchTerm={activeAppletObj?.name}
                          preselectedImageUrl={activeAppletObj?.imageUrl}
                          className="w-full"
                          instanceId={`applet-${activeAppletObj?.id}`}
                          saveTo="public"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Upload an image for your applet. This will be displayed on applet cards.
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Applet ID: </span>
                        <span className="font-mono">{activeAppletObj.id}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Preview section */}
                  <div className="w-full md:w-1/3">
                    <div className="sticky top-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Preview</p>
                      <AppletPreviewCard applet={activeAppletObj} className="max-w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Create new applet form */
              <div className="space-y-5">
                <h3 className="text-gray-900 dark:text-gray-100 font-medium">Create New Applet</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Form section */}
                  <div className="w-full md:w-2/3 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="e.g. Hotels Search"
                        value={newApplet.name}
                        onChange={handleNameChange}
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creatorName" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Creator Name
                      </Label>
                      <Input
                        id="creatorName"
                        name="creatorName"
                        placeholder="e.g. John Doe"
                        value={newApplet.creatorName}
                        onChange={handleNewAppletChange}
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet URL Slug
                      </Label>
                      <div className="relative">
                        <Input
                          id="slug"
                          name="slug"
                          placeholder="e.g. hotels-search"
                          value={newApplet.slug}
                          onChange={handleNewAppletChange}
                          className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${slugError ? 'border-red-300 dark:border-red-700' : ''}`}
                        />
                        <div className="flex items-center mt-1.5">
                          <LinkIcon className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getAppletUrl(config.name, newApplet.slug)}
                          </span>
                        </div>
                        {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Enter applet description"
                        value={newApplet.description}
                        onChange={handleNewAppletChange}
                        rows={4}
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Briefly describe what this applet does and how users will interact with it.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Applet Image
                      </Label>
                      <div className="w-full">
                        <SingleImageSelect 
                          size="md"
                          aspectRatio="landscape"
                          placeholder="Select Applet Image"
                          onImageSelected={handleImageSelected}
                          onImageRemoved={handleImageRemoved}
                          initialTab="public-search"
                          initialSearchTerm={newApplet.name}
                          preselectedImageUrl={newApplet.imageUrl}
                          className="w-full"
                          instanceId={`applet-${newApplet.id}`}
                          saveTo="public"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Upload an image for your applet. This will be displayed on applet cards.
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Applet ID: </span>
                        <span className="font-mono">{newApplet.id}</span>
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleAddApplet} 
                      disabled={!newApplet.name || !newApplet.slug || !!slugError}
                      className="w-full mt-4 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Applet
                    </Button>
                  </div>
                  
                  {/* Preview section */}
                  <div className="w-full md:w-1/3">
                    <div className="sticky top-1">
                      <AppletPreviewCard applet={newApplet as Applet} className="max-w-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right side: Applet list */}
          <div className="w-full md:w-1/3 border-l border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-4">Your Applets</h3>
            
            <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
              {applets.length === 0 ? (
                <div className="flex items-center justify-center h-24 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No applets added yet</p>
                </div>
              ) : (
                applets.map((applet) => (
                  <div 
                    key={applet.id} 
                    className={`p-3 rounded-md cursor-pointer transition-all duration-200 ${
                      activeApplet === applet.id 
                        ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800' 
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => setActiveApplet(applet.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge 
                          variant={activeApplet === applet.id ? "default" : "outline"}
                          className={activeApplet === applet.id 
                            ? "bg-rose-500 dark:bg-rose-600 text-white hover:bg-rose-600 dark:hover:bg-rose-700"
                            : "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                          }
                        >
                          {applet.name}
                        </Badge>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveApplet(applet.id);
                        }}
                        className="h-7 w-7 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="line-clamp-2">{applet.description || 'No description'}</div>
                      <div className="mt-1">Created by: {applet.creatorName || 'Unknown'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setActiveApplet('')}
              className="w-full mt-2 border-rose-300 dark:border-rose-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Applet
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}; 