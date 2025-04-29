'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, SaveIcon, CheckIcon, BoxIcon, TrashIcon } from 'lucide-react';
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
import { Applet } from '@/features/applet/builder/ConfigBuilder';
import { SavedGroup } from './GroupBuilder';

export interface SavedApplet extends Applet {
  createdAt: string;
  lastModified: string;
  groups: SavedGroup[];
}

export const AppletBuilder = () => {
  const { toast } = useToast();
  const [newApplet, setNewApplet] = useState<Partial<Applet>>({
    id: '',
    name: '',
    description: '',
    creatorName: '',
    slug: '',
    imageUrl: ''
  });
  const [savedApplets, setSavedApplets] = useState<SavedApplet[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedApplet, setSelectedApplet] = useState<SavedApplet | null>(null);
  const [showAddGroupsDialog, setShowAddGroupsDialog] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<SavedGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Load saved applets and groups from localStorage on component mount
  useEffect(() => {
    // Load saved applets
    const storedApplets = localStorage.getItem('savedApplets');
    if (storedApplets) {
      try {
        setSavedApplets(JSON.parse(storedApplets));
      } catch (e) {
        console.error('Failed to parse saved applets', e);
      }
    }
    
    // Load available groups
    const storedGroups = localStorage.getItem('savedGroups');
    if (storedGroups) {
      try {
        setAvailableGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse saved groups', e);
      }
    }
  }, []);

  // Save applets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedApplets', JSON.stringify(savedApplets));
  }, [savedApplets]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApplet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewApplet(prev => ({
      ...prev,
      name,
      id: prev.id || name.toLowerCase().replace(/\s+/g, '-'),
      slug: prev.slug || name.toLowerCase().replace(/\s+/g, '-')
    }));
  };

  const resetForm = () => {
    setNewApplet({
      id: '',
      name: '',
      description: '',
      creatorName: '',
      slug: '',
      imageUrl: ''
    });
    setSelectedApplet(null);
    setSelectedGroups([]);
  };

  const saveApplet = () => {
    if (!newApplet.id || !newApplet.name) {
      toast({
        title: "Validation Error",
        description: "Applet ID and name are required",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const groupsToAdd = selectedApplet?.groups || [];
    
    const newSavedApplet: SavedApplet = {
      ...newApplet as Applet,
      createdAt: now,
      lastModified: now,
      groups: groupsToAdd
    };

    setSavedApplets(prev => [...prev, newSavedApplet]);
    
    toast({
      title: "Applet Saved",
      description: `Applet "${newApplet.name}" has been saved successfully.`,
    });
    
    resetForm();
  };

  const editApplet = (applet: SavedApplet) => {
    setSelectedApplet(applet);
    setNewApplet({
      id: applet.id,
      name: applet.name,
      description: applet.description,
      creatorName: applet.creatorName,
      slug: applet.slug,
      imageUrl: applet.imageUrl
    });
    setActiveTab('create');
  };

  const updateApplet = () => {
    if (!selectedApplet) return;
    
    const updatedApplets = savedApplets.map(applet => {
      if (applet.id === selectedApplet.id) {
        return {
          ...applet,
          ...newApplet as Applet,
          lastModified: new Date().toISOString(),
          groups: applet.groups // Preserve existing groups
        };
      }
      return applet;
    });
    
    setSavedApplets(updatedApplets);
    setSelectedApplet(null);
    toast({
      title: "Applet Updated",
      description: `Applet "${newApplet.name}" has been updated successfully.`,
    });
    resetForm();
  };

  const deleteApplet = (id: string) => {
    setSavedApplets(prev => prev.filter(applet => applet.id !== id));
    toast({
      title: "Applet Deleted",
      description: "Applet has been deleted successfully.",
    });
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const addSelectedGroupsToApplet = () => {
    if (selectedGroups.length === 0) {
      setShowAddGroupsDialog(false);
      return;
    }
    
    if (!selectedApplet) return;
    
    const groupsToAdd = availableGroups.filter(group => 
      selectedGroups.includes(group.id)
    );
    
    // Find the applet and update its groups
    const updatedApplets = savedApplets.map(applet => {
      if (applet.id === selectedApplet.id) {
        // Check for duplicates
        const existingGroupIds = applet.groups.map(g => g.id);
        const newGroups = groupsToAdd.filter(g => !existingGroupIds.includes(g.id));
        
        return {
          ...applet,
          groups: [...applet.groups, ...newGroups],
          lastModified: new Date().toISOString()
        };
      }
      return applet;
    });
    
    setSavedApplets(updatedApplets);
    setSelectedGroups([]);
    setShowAddGroupsDialog(false);
    
    // Also update the selected applet for the UI
    const updatedApplet = updatedApplets.find(a => a.id === selectedApplet.id);
    if (updatedApplet) {
      setSelectedApplet(updatedApplet);
    }
    
    toast({
      title: "Groups Added",
      description: `${groupsToAdd.length} groups added to the applet.`,
    });
  };

  const removeGroupFromApplet = (appletId: string, groupId: string) => {
    const updatedApplets = savedApplets.map(applet => {
      if (applet.id === appletId) {
        return {
          ...applet,
          groups: applet.groups.filter(g => g.id !== groupId),
          lastModified: new Date().toISOString()
        };
      }
      return applet;
    });
    
    setSavedApplets(updatedApplets);
    
    // Update selected applet if it's the one we're modifying
    if (selectedApplet && selectedApplet.id === appletId) {
      const updatedApplet = updatedApplets.find(a => a.id === appletId);
      if (updatedApplet) {
        setSelectedApplet(updatedApplet);
      }
    }
    
    toast({
      title: "Group Removed",
      description: "Group has been removed from the applet.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">Applet Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage applets for your applications
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
              >
                Create Applet
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
              >
                Saved Applets ({savedApplets.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">
                        Applet Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={newApplet.name || ''}
                        onChange={handleNameChange}
                        placeholder="Enter applet name"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="id" className="text-gray-900 dark:text-gray-100">
                        Applet ID
                      </Label>
                      <Input
                        id="id"
                        name="id"
                        value={newApplet.id || ''}
                        onChange={handleInputChange}
                        placeholder="Enter applet ID"
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
                        value={newApplet.description || ''}
                        onChange={handleInputChange}
                        placeholder="Enter applet description"
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
                        value={newApplet.creatorName || ''}
                        onChange={handleInputChange}
                        placeholder="Enter creator name"
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
                        value={newApplet.slug || ''}
                        onChange={handleInputChange}
                        placeholder="Enter applet slug"
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
                        value={newApplet.imageUrl || ''}
                        onChange={handleInputChange}
                        placeholder="Enter image URL"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
                
                {selectedApplet && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-900 dark:text-gray-100">
                        Groups ({selectedApplet.groups.length})
                      </Label>
                      <Button
                        onClick={() => setShowAddGroupsDialog(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Groups
                      </Button>
                    </div>
                    
                    {selectedApplet.groups.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                        <BoxIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No groups added yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddGroupsDialog(true)}
                          className="mt-4 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Add Groups
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedApplet.groups.map(group => (
                          <Card key={group.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                                {group.label}
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                {group.id}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <p><span className="font-medium">Fields:</span> {group.fields.length}</p>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGroupFromApplet(selectedApplet.id, group.id)}
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
                    onClick={selectedApplet ? updateApplet : saveApplet}
                    className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                  >
                    {selectedApplet ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update Applet</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save Applet</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {savedApplets.length === 0 ? (
                <div className="text-center py-8">
                  <BoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No applets</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new applet
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Applet
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedApplets.map(applet => (
                    <Card key={applet.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {applet.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {applet.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {applet.description && (
                            <p className="mb-2 truncate">{applet.description}</p>
                          )}
                          <p><span className="font-medium">Groups:</span> {applet.groups.length}</p>
                          <p><span className="font-medium">Created By:</span> {applet.creatorName || 'Unknown'}</p>
                          <p><span className="font-medium">Last Updated:</span> {new Date(applet.lastModified).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteApplet(applet.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editApplet(applet)}
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
      
      <Dialog open={showAddGroupsDialog} onOpenChange={setShowAddGroupsDialog}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Groups to Applet</DialogTitle>
            <DialogDescription>
              Select groups to add to your applet
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableGroups.length === 0 ? (
              <div className="text-center py-8">
                <BoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No groups available</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create groups first in the Group Builder
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableGroups
                    .filter(group => !selectedApplet?.groups.some(g => g.id === group.id))
                    .map(group => (
                      <li 
                        key={group.id} 
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedGroups.includes(group.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                        }`}
                        onClick={() => toggleGroupSelection(group.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {group.id} · {group.fields.length} fields
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded border ${
                          selectedGroups.includes(group.id) 
                            ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600 flex items-center justify-center' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedGroups.includes(group.id) && (
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
                setShowAddGroupsDialog(false);
                setSelectedGroups([]);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={addSelectedGroupsToApplet}
              disabled={selectedGroups.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
            >
              Add Selected ({selectedGroups.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
};

export default AppletBuilder; 