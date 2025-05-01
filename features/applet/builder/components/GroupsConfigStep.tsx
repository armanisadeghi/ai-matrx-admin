'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, XIcon, Edit, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { CustomAppletConfig, ComponentGroup } from '@/features/applet/builder/builder.types';

interface GroupsConfigStepProps {
  applets: CustomAppletConfig[];
  availableGroups: ComponentGroup[];
  activeApplet: string | null;
  activeGroup: string | null;
  setActiveApplet: (appletId: string) => void;
  setActiveGroup: (groupId: string) => void;
  addGroup: (group: ComponentGroup) => Promise<void>;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({
  applets,
  availableGroups,
  activeApplet,
  activeGroup,
  setActiveApplet,
  setActiveGroup,
  addGroup
}) => {
  const [newGroup, setNewGroup] = useState<Partial<ComponentGroup>>({
    id: '',
    label: '',
    shortLabel: '',
    description: '',
    fields: []
  });
  const [showExistingGroups, setShowExistingGroups] = useState(false);

  // Set the active applet if it's not set and there are applets available
  useEffect(() => {
    if (!activeApplet && applets.length > 0) {
      setActiveApplet(applets[0].id);
    }
  }, [activeApplet, applets, setActiveApplet]);

  const handleAppletChange = (value: string) => {
    setActiveApplet(value);
    setActiveGroup('');
  };

  const handleGroupSelect = (groupId: string) => {
    setActiveGroup(groupId);
  };

  const handleExistingGroupSelect = (group: ComponentGroup) => {
    addGroup(group);
    setShowExistingGroups(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewGroup(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddGroup = () => {
    if (newGroup.id && newGroup.label && newGroup.shortLabel) {
      addGroup({
        id: newGroup.id,
        label: newGroup.label,
        shortLabel: newGroup.shortLabel,
        description: newGroup.description || '',
        fields: []
      } as ComponentGroup);
      
      // Reset form
      setNewGroup({
        id: '',
        label: '',
        shortLabel: '',
        description: '',
        fields: []
      });
    }
  };

  const generateGroupId = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-');
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setNewGroup(prev => ({
      ...prev,
      label,
      id: prev.id || generateGroupId(label)
    }));
  };

  // Get the current active applet
  const activeAppletObj = activeApplet 
    ? applets.find(a => a.id === activeApplet) 
    : null;
  
  // Get groups for the active applet
  const appletGroups = activeAppletObj?.containers || [];
  
  // Filter available groups that haven't been added to this applet
  const filteredAvailableGroups = availableGroups.filter(
    group => !appletGroups.some(container => container.groupId === group.id)
  );

  return (
    <div className="space-y-6">
      {applets.length === 0 ? (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No applets have been created yet. Please go back and add applets first.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs 
            value={activeApplet || ''} 
            onValueChange={handleAppletChange}
            className="w-full"
          >
            <TabsList className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
              {applets.map((applet) => (
                <TabsTrigger 
                  key={applet.id} 
                  value={applet.id}
                  className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm"
                >
                  {applet.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {applets.map((applet) => (
              <TabsContent 
                key={applet.id} 
                value={applet.id}
                className="mt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add new group form */}
                  <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                            Add Group
                          </CardTitle>
                          <CardDescription className="text-gray-500 dark:text-gray-400">
                            Create or select a group for {applet.name}
                          </CardDescription>
                        </div>
                        
                        {filteredAvailableGroups.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowExistingGroups(!showExistingGroups)}
                            className="border-rose-300 dark:border-rose-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            {showExistingGroups ? 'Create New' : 'Use Existing Group'}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {showExistingGroups ? (
                        /* Existing groups selection */
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Select an existing group to add to this applet:
                          </p>
                          
                          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                            {filteredAvailableGroups.map(group => (
                              <div 
                                key={group.id} 
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-rose-300 dark:hover:border-rose-700 cursor-pointer"
                                onClick={() => handleExistingGroupSelect(group)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{group.label}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {group.shortLabel}
                                    </p>
                                    {group.description && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {group.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                    {group.id}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* New group creation form */
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="label" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Group Label
                            </Label>
                            <Input
                              id="label"
                              name="label"
                              placeholder="e.g. Location"
                              value={newGroup.label}
                              onChange={handleLabelChange}
                              className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="id" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Group ID
                            </Label>
                            <Input
                              id="id"
                              name="id"
                              placeholder="e.g. location"
                              value={newGroup.id}
                              onChange={handleInputChange}
                              className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              A unique identifier for this group. Use lowercase letters, numbers, and hyphens.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shortLabel" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Short Label / Placeholder
                            </Label>
                            <Input
                              id="shortLabel"
                              name="shortLabel"
                              placeholder="e.g. Where are you going?"
                              value={newGroup.shortLabel}
                              onChange={handleInputChange}
                              className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Description (Optional)
                            </Label>
                            <Textarea
                              id="description"
                              name="description"
                              placeholder="Enter a description for this group"
                              value={newGroup.description || ''}
                              onChange={handleInputChange}
                              rows={3}
                              className="resize-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          
                          <Button
                            onClick={handleAddGroup}
                            disabled={!newGroup.id || !newGroup.label || !newGroup.shortLabel}
                            className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Group
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* List of groups */}
                  <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        Configured Groups
                      </CardTitle>
                      <CardDescription className="text-gray-500 dark:text-gray-400">
                        Groups for the {applet.name} applet
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {!applet.containers || applet.containers.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-gray-500 dark:text-gray-400">
                            No groups added to this applet yet
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Use the form to add your first group
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {applet.containers.map((container, index) => {
                            // Find the full group info if it exists
                            const groupInfo = availableGroups.find(g => g.id === container.groupId);
                            const groupLabel = groupInfo?.label || container.label;
                            const groupShortLabel = groupInfo?.shortLabel || container.shortLabel;
                            
                            return (
                              <div 
                                key={container.groupId || container.id || index}
                                onClick={() => handleGroupSelect(container.groupId || container.id || '')}
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  activeGroup === (container.groupId || container.id)
                                    ? 'border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{groupLabel}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {groupShortLabel}
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                    {container.fields?.length || 0} fields
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
};

export default GroupsConfigStep; 