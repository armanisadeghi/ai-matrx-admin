'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, SaveIcon, CheckIcon, AppWindowIcon, TrashIcon } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { AppConfig } from '@/features/applet/builder/ConfigBuilder';
import { SavedApplet } from './AppletBuilder';

export interface SavedApp extends Partial<AppConfig> {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  applets: SavedApplet[];
}

export const AppBuilder = () => {
  const { toast } = useToast();
  const [newApp, setNewApp] = useState<Partial<AppConfig>>({
    id: '',
    name: '',
    description: '',
    creatorName: '',
    imageUrl: '',
    applets: []
  });
  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedApp, setSelectedApp] = useState<SavedApp | null>(null);
  const [showAddAppletsDialog, setShowAddAppletsDialog] = useState(false);
  const [availableApplets, setAvailableApplets] = useState<SavedApplet[]>([]);
  const [selectedApplets, setSelectedApplets] = useState<string[]>([]);

  // Load saved apps and applets from localStorage on component mount
  useEffect(() => {
    // Load saved apps
    const storedApps = localStorage.getItem('savedApps');
    if (storedApps) {
      try {
        setSavedApps(JSON.parse(storedApps));
      } catch (e) {
        console.error('Failed to parse saved apps', e);
      }
    }
    
    // Load available applets
    const storedApplets = localStorage.getItem('savedApplets');
    if (storedApplets) {
      try {
        setAvailableApplets(JSON.parse(storedApplets));
      } catch (e) {
        console.error('Failed to parse saved applets', e);
      }
    }
  }, []);

  // Save apps to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedApps', JSON.stringify(savedApps));
  }, [savedApps]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApp(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewApp(prev => ({
      ...prev,
      name,
      id: prev.id || name.toLowerCase().replace(/\s+/g, '-')
    }));
  };

  const resetForm = () => {
    setNewApp({
      id: '',
      name: '',
      description: '',
      creatorName: '',
      imageUrl: '',
      applets: []
    });
    setSelectedApp(null);
    setSelectedApplets([]);
  };

  const saveApp = () => {
    if (!newApp.id || !newApp.name) {
      toast({
        title: "Validation Error",
        description: "App ID and name are required",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const appletsToAdd = selectedApp?.applets || [];
    
    const newSavedApp: SavedApp = {
      ...newApp,
      id: newApp.id,
      name: newApp.name,
      createdAt: now,
      lastModified: now,
      applets: appletsToAdd
    };

    setSavedApps(prev => [...prev, newSavedApp]);
    
    toast({
      title: "App Saved",
      description: `App "${newApp.name}" has been saved successfully.`,
    });
    
    resetForm();
  };

  const editApp = (app: SavedApp) => {
    setSelectedApp(app);
    setNewApp({
      id: app.id,
      name: app.name,
      description: app.description,
      creatorName: app.creatorName,
      imageUrl: app.imageUrl,
      applets: app.applets
    });
    setActiveTab('create');
  };

  const updateApp = () => {
    if (!selectedApp) return;
    
    const updatedApps = savedApps.map(app => {
      if (app.id === selectedApp.id) {
        return {
          ...app,
          ...newApp,
          name: newApp.name || app.name,
          lastModified: new Date().toISOString(),
          applets: app.applets // Preserve existing applets
        };
      }
      return app;
    });
    
    setSavedApps(updatedApps);
    setSelectedApp(null);
    toast({
      title: "App Updated",
      description: `App "${newApp.name}" has been updated successfully.`,
    });
    resetForm();
  };

  const deleteApp = (id: string) => {
    setSavedApps(prev => prev.filter(app => app.id !== id));
    toast({
      title: "App Deleted",
      description: "App has been deleted successfully.",
    });
  };

  const toggleAppletSelection = (appletId: string) => {
    setSelectedApplets(prev => 
      prev.includes(appletId) 
        ? prev.filter(id => id !== appletId)
        : [...prev, appletId]
    );
  };

  const addSelectedAppletsToApp = () => {
    if (selectedApplets.length === 0) {
      setShowAddAppletsDialog(false);
      return;
    }
    
    if (!selectedApp) return;
    
    const appletsToAdd = availableApplets.filter(applet => 
      selectedApplets.includes(applet.id)
    );
    
    // Find the app and update its applets
    const updatedApps = savedApps.map(app => {
      if (app.id === selectedApp.id) {
        // Check for duplicates
        const existingAppletIds = app.applets.map(a => a.id);
        const newApplets = appletsToAdd.filter(a => !existingAppletIds.includes(a.id));
        
        return {
          ...app,
          applets: [...app.applets, ...newApplets],
          lastModified: new Date().toISOString()
        };
      }
      return app;
    });
    
    setSavedApps(updatedApps);
    setSelectedApplets([]);
    setShowAddAppletsDialog(false);
    
    // Also update the selected app for the UI
    const updatedApp = updatedApps.find(a => a.id === selectedApp.id);
    if (updatedApp) {
      setSelectedApp(updatedApp);
    }
    
    toast({
      title: "Applets Added",
      description: `${appletsToAdd.length} applets added to the app.`,
    });
  };

  const removeAppletFromApp = (appId: string, appletId: string) => {
    const updatedApps = savedApps.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          applets: app.applets.filter(a => a.id !== appletId),
          lastModified: new Date().toISOString()
        };
      }
      return app;
    });
    
    setSavedApps(updatedApps);
    
    // Update selected app if it's the one we're modifying
    if (selectedApp && selectedApp.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }
    
    toast({
      title: "Applet Removed",
      description: "Applet has been removed from the app.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">App Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage apps with reusable applets
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
              >
                Create App
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
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
                      <Label htmlFor="id" className="text-gray-900 dark:text-gray-100">
                        App ID
                      </Label>
                      <Input
                        id="id"
                        name="id"
                        value={newApp.id || ''}
                        onChange={handleInputChange}
                        placeholder="Enter app ID"
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
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="creatorName" className="text-gray-900 dark:text-gray-100">
                        Creator Name
                      </Label>
                      <Input
                        id="creatorName"
                        name="creatorName"
                        value={newApp.creatorName || ''}
                        onChange={handleInputChange}
                        placeholder="Enter creator name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-gray-900 dark:text-gray-100">
                        Image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        value={newApp.imageUrl || ''}
                        onChange={handleInputChange}
                        placeholder="Enter image URL"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
                
                {selectedApp && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-900 dark:text-gray-100">
                        Applets ({selectedApp.applets.length})
                      </Label>
                      <Button
                        onClick={() => setShowAddAppletsDialog(true)}
                        className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Applets
                      </Button>
                    </div>
                    
                    {selectedApp.applets.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                        <AppWindowIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No applets added yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddAppletsDialog(true)}
                          className="mt-4 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Add Applets
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedApp.applets.map(applet => (
                          <Card key={applet.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                                {applet.name}
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                {applet.id}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {applet.description && (
                                  <p className="mb-2 truncate">{applet.description}</p>
                                )}
                                <p><span className="font-medium">Created By:</span> {applet.creatorName || 'Unknown'}</p>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAppletFromApp(selectedApp.id, applet.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <TrashIcon className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
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
                    className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
                  >
                    {selectedApp ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update App</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save App</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {savedApps.length === 0 ? (
                <div className="text-center py-8">
                  <AppWindowIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No apps</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new app
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New App
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedApps.map(app => (
                    <Card key={app.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {app.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {app.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {app.description && (
                            <p className="mb-2 truncate">{app.description}</p>
                          )}
                          <p><span className="font-medium">Applets:</span> {app.applets.length}</p>
                          <p><span className="font-medium">Created By:</span> {app.creatorName || 'Unknown'}</p>
                          <p><span className="font-medium">Last Updated:</span> {new Date(app.lastModified).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteApp(app.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editApp(app)}
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
      
      <Dialog open={showAddAppletsDialog} onOpenChange={setShowAddAppletsDialog}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Applets to App</DialogTitle>
            <DialogDescription>
              Select applets to add to your app
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableApplets.length === 0 ? (
              <div className="text-center py-8">
                <AppWindowIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No applets available</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create applets first in the Applet Builder
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableApplets
                    .filter(applet => !selectedApp?.applets.some(a => a.id === applet.id))
                    .map(applet => (
                      <li 
                        key={applet.id} 
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedApplets.includes(applet.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                        onClick={() => toggleAppletSelection(applet.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{applet.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {applet.id} · {applet.groups?.length || 0} groups
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded border ${
                          selectedApplets.includes(applet.id) 
                            ? 'bg-indigo-500 border-indigo-500 dark:bg-indigo-600 dark:border-indigo-600 flex items-center justify-center' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedApplets.includes(applet.id) && (
                            <CheckIcon className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAppletsDialog(false);
                setSelectedApplets([]);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={addSelectedAppletsToApp}
              disabled={selectedApplets.length === 0}
              className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
            >
              Add Selected ({selectedApplets.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
};

export default AppBuilder; 