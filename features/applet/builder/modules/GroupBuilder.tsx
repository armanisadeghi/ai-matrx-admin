'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, SaveIcon, FolderIcon, CheckIcon, LayersIcon, FileTextIcon, TrashIcon } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { GroupFieldConfig, AppletContainersConfig } from '@/features/applet/runner/components/field-components/types';
import { SavedField } from './FieldBuilder';

// Helper function to generate ID
const generateGroupId = (label: string) => {
  return label.toLowerCase().replace(/\s+/g, '-');
};

export interface SavedGroup extends AppletContainersConfig {
  id: string; // Preserve the group ID from AppletContainersConfig
  createdAt: string;
  lastModified: string;
}

export const GroupBuilder = () => {
  const { toast } = useToast();
  const [newGroup, setNewGroup] = useState<Partial<AppletContainersConfig>>({
    id: '',
    label: '',
    placeholder: '',
    description: '',
    fields: []
  });
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedGroup, setSelectedGroup] = useState<SavedGroup | null>(null);
  const [showAddFieldsDialog, setShowAddFieldsDialog] = useState(false);
  const [availableFields, setAvailableFields] = useState<SavedField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Load saved groups and fields from localStorage on component mount
  useEffect(() => {
    // Load saved groups
    const storedGroups = localStorage.getItem('savedGroups');
    if (storedGroups) {
      try {
        setSavedGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse saved groups', e);
      }
    }
    
    // Load available fields
    const storedFields = localStorage.getItem('savedFields');
    if (storedFields) {
      try {
        setAvailableFields(JSON.parse(storedFields));
      } catch (e) {
        console.error('Failed to parse saved fields', e);
      }
    }
  }, []);

  // Save groups to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedGroups', JSON.stringify(savedGroups));
  }, [savedGroups]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewGroup(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setNewGroup(prev => ({
      ...prev,
      label,
      id: prev.id || generateGroupId(label)
    }));
  };

  const resetForm = () => {
    setNewGroup({
      id: '',
      label: '',
      placeholder: '',
      description: '',
      fields: []
    });
    setSelectedGroup(null);
    setSelectedFields([]);
  };

  const saveGroup = () => {
    if (!newGroup.id || !newGroup.label || !newGroup.placeholder) {
      toast({
        title: "Validation Error",
        description: "Group ID, label and placeholder are required",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const newSavedGroup: SavedGroup = {
      ...newGroup as AppletContainersConfig,
      id: newGroup.id,
      createdAt: now,
      lastModified: now
    };

    setSavedGroups(prev => [...prev, newSavedGroup]);
    
    toast({
      title: "Group Saved",
      description: `Group "${newGroup.label}" has been saved successfully.`,
    });
    
    resetForm();
  };

  const editGroup = (group: SavedGroup) => {
    setSelectedGroup(group);
    setNewGroup({
      id: group.id,
      label: group.label,
      placeholder: group.placeholder,
      description: group.description,
      fields: group.fields
    });
    setActiveTab('create');
  };

  const updateGroup = () => {
    if (!selectedGroup) return;
    
    const updatedGroups = savedGroups.map(group => {
      if (group.id === selectedGroup.id) {
        return {
          ...group,
          ...newGroup as AppletContainersConfig,
          lastModified: new Date().toISOString()
        };
      }
      return group;
    });
    
    setSavedGroups(updatedGroups);
    setSelectedGroup(null);
    toast({
      title: "Group Updated",
      description: `Group "${newGroup.label}" has been updated successfully.`,
    });
    resetForm();
  };

  const deleteGroup = (id: string) => {
    setSavedGroups(prev => prev.filter(group => group.id !== id));
    toast({
      title: "Group Deleted",
      description: "Group has been deleted successfully.",
    });
  };

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addSelectedFieldsToGroup = () => {
    if (selectedFields.length === 0) {
      setShowAddFieldsDialog(false);
      return;
    }
    
    const fieldsToAdd = availableFields.filter(field => 
      selectedFields.includes(field.id)
    ) as GroupFieldConfig[];
    
    setNewGroup(prev => ({
      ...prev,
      fields: [...(prev.fields || []), ...fieldsToAdd]
    }));
    
    setShowAddFieldsDialog(false);
    setSelectedFields([]);
    
    toast({
      title: "Fields Added",
      description: `${fieldsToAdd.length} fields added to the group.`,
    });
  };

  const removeFieldFromGroup = (fieldIndex: number) => {
    setNewGroup(prev => ({
      ...prev,
      fields: prev.fields?.filter((_, index) => index !== fieldIndex) || []
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-amber-500 dark:text-amber-400">Broker Group Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage field groups for your applets
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
              >
                Create Group
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
              >
                Saved Groups ({savedGroups.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="label" className="text-gray-900 dark:text-gray-100">
                          Group Label
                        </Label>
                        <Input
                          id="label"
                          name="label"
                          value={newGroup.label || ''}
                          onChange={handleLabelChange}
                          placeholder="Enter group label"
                          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="id" className="text-gray-900 dark:text-gray-100">
                          Group ID
                        </Label>
                        <Input
                          id="id"
                          name="id"
                          value={newGroup.id || ''}
                          onChange={handleInputChange}
                          placeholder="Enter group ID"
                          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Auto-generated from label, but can be customized
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="placeholder" className="text-gray-900 dark:text-gray-100">
                        Placeholder
                      </Label>
                      <Input
                        id="placeholder"
                        name="placeholder"
                        value={newGroup.placeholder || ''}
                        onChange={handleInputChange}
                        placeholder="Enter placeholder text"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={newGroup.description || ''}
                        onChange={handleInputChange}
                        placeholder="Enter group description"
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-900 dark:text-gray-100">
                        Fields ({newGroup.fields?.length || 0})
                      </Label>
                      <Button
                        onClick={() => setShowAddFieldsDialog(true)}
                        className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Fields
                      </Button>
                    </div>
                    
                    {(!newGroup.fields || newGroup.fields.length === 0) ? (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                        <FileTextIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No fields added yet</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAddFieldsDialog(true)}
                          className="mt-4 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          Add Fields
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Field List
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {newGroup.fields?.map((field, index) => (
                            <li key={index} className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {field.brokerId} · {field.type}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFieldFromGroup(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                    onClick={selectedGroup ? updateGroup : saveGroup}
                    className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                  >
                    {selectedGroup ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update Group</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save Group</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {savedGroups.length === 0 ? (
                <div className="text-center py-8">
                  <LayersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No groups</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new group
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Group
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedGroups.map(group => (
                    <Card key={group.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {group.label}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {group.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {group.description && (
                            <p className="mb-2 truncate">{group.description}</p>
                          )}
                          <p><span className="font-medium">Fields:</span> {group.fields.length}</p>
                          <p><span className="font-medium">Last Updated:</span> {new Date(group.lastModified).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGroup(group.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editGroup(group)}
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
      
      <Dialog open={showAddFieldsDialog} onOpenChange={setShowAddFieldsDialog}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Fields to Group</DialogTitle>
            <DialogDescription>
              Select fields to add to your group
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {availableFields.length === 0 ? (
              <div className="text-center py-8">
                <FileTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No fields available</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create fields first in the Field Builder
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableFields.map(field => (
                    <li 
                      key={field.id} 
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedFields.includes(field.id) ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      }`}
                      onClick={() => toggleFieldSelection(field.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {field.brokerId} · {field.type}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded border ${
                        selectedFields.includes(field.id) 
                          ? 'bg-amber-500 border-amber-500 dark:bg-amber-600 dark:border-amber-600 flex items-center justify-center' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedFields.includes(field.id) && (
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
                setShowAddFieldsDialog(false);
                setSelectedFields([]);
              }}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={addSelectedFieldsToGroup}
              disabled={selectedFields.length === 0}
              className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
            >
              Add Selected ({selectedFields.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
};

export default GroupBuilder; 