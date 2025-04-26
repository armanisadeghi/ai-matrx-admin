import React, { useState } from 'react';
import { PlusIcon, XIcon, EditIcon, CheckIcon } from 'lucide-react';
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
import { TabSearchConfig, SearchGroupConfig } from '../../runner/components/field-components/types';

interface GroupsConfigStepProps {
  tabs: { value: string; label: string }[];
  searchConfig: TabSearchConfig;
  activeTab: string | null;
  activeGroup: string | null;
  setActiveTab: (tabValue: string) => void;
  setActiveGroup: (groupId: string) => void;
  addGroup: (group: SearchGroupConfig) => void;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({
  tabs,
  searchConfig,
  activeTab,
  activeGroup,
  setActiveTab,
  setActiveGroup,
  addGroup
}) => {
  const [newGroup, setNewGroup] = useState<Partial<SearchGroupConfig>>({
    id: '',
    label: '',
    placeholder: '',
    description: '',
    fields: []
  });

  // Set the active tab if it's not set and there are tabs available
  React.useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].value);
    }
  }, [activeTab, tabs, setActiveTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setActiveGroup(null);
  };

  const handleGroupSelect = (groupId: string) => {
    setActiveGroup(groupId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewGroup(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddGroup = () => {
    if (newGroup.id && newGroup.label && newGroup.placeholder) {
      addGroup({
        id: newGroup.id,
        label: newGroup.label,
        placeholder: newGroup.placeholder,
        description: newGroup.description,
        fields: []
      });
      
      // Reset form
      setNewGroup({
        id: '',
        label: '',
        placeholder: '',
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

  const removeGroup = (tabValue: string, groupIndex: number) => {
    // Implementation would go here
    console.log(`Remove group at index ${groupIndex} from tab ${tabValue}`);
    // This would require a prop to update the searchConfig
  };

  return (
    <div className="space-y-6">
      {tabs.length === 0 ? (
        <Card className="border border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No tabs have been created yet. Please go back and add tabs first.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs 
            value={activeTab || ''} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent 
                key={tab.value} 
                value={tab.value}
                className="mt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add new group form */}
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Add Search Group
                      </CardTitle>
                      <CardDescription>
                        Create a new search group for the {tab.label} tab
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="label" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Group Label
                          </Label>
                          <Input
                            id="label"
                            name="label"
                            placeholder="e.g. Location"
                            value={newGroup.label}
                            onChange={handleLabelChange}
                            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="id" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Group ID
                          </Label>
                          <Input
                            id="id"
                            name="id"
                            placeholder="e.g. location"
                            value={newGroup.id}
                            onChange={handleInputChange}
                            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                          />
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            A unique identifier for this group. Use lowercase letters, numbers, and hyphens.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="placeholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Placeholder Text
                          </Label>
                          <Input
                            id="placeholder"
                            name="placeholder"
                            placeholder="e.g. Where are you going?"
                            value={newGroup.placeholder}
                            onChange={handleInputChange}
                            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Description (Optional)
                          </Label>
                          <Textarea
                            id="description"
                            name="description"
                            placeholder="Enter a description for this group"
                            value={newGroup.description}
                            onChange={handleInputChange}
                            rows={3}
                            className="resize-none border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                        
                        <Button
                          onClick={handleAddGroup}
                          disabled={!newGroup.id || !newGroup.label || !newGroup.placeholder}
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Group
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* List of groups */}
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Configured Groups
                      </CardTitle>
                      <CardDescription>
                        Search groups for the {tab.label} tab
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {searchConfig[tab.value]?.length ? (
                        <div className="space-y-3">
                          {searchConfig[tab.value].map((group, index) => (
                            <div 
                              key={group.id}
                              onClick={() => handleGroupSelect(group.id)}
                              className={`p-3 rounded-md cursor-pointer ${
                                activeGroup === group.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {group.label}
                                </h3>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeGroup(tab.value, index);
                                  }}
                                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {group.placeholder}
                              </p>
                              {group.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                  {group.description}
                                </p>
                              )}
                              <div className="mt-2 flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Fields: {group.fields.length}</span>
                                {group.fields.length === 0 && (
                                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                                    (No fields added yet)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-40 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
                          <p className="text-zinc-500 dark:text-zinc-400">No groups added yet</p>
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