import React, { useState } from 'react';
import { PlusIcon, XIcon, EditIcon, CheckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppletConfig } from '../ConfigBuilder';

interface TabsConfigStepProps {
  tabs: { value: string; label: string }[];
  addTab: (tab: { value: string; label: string }) => void;
  updateConfig: (updates: Partial<AppletConfig>) => void;
  activeTab: string | null;
  setActiveTab: (tabValue: string) => void;
  config: Partial<AppletConfig>;
}

export const TabsConfigStep: React.FC<TabsConfigStepProps> = ({
  tabs,
  addTab,
  updateConfig,
  activeTab,
  setActiveTab,
  config
}) => {
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabValue, setNewTabValue] = useState('');
  const [editingTab, setEditingTab] = useState<{ index: number; field: 'label' | 'value'; value: string } | null>(null);

  const handleAddTab = () => {
    if (newTabLabel && newTabValue) {
      addTab({ label: newTabLabel, value: newTabValue });
      setNewTabLabel('');
      setNewTabValue('');
    }
  };

  const handleRemoveTab = (index: number) => {
    const updatedTabs = [...tabs];
    const removedTab = updatedTabs[index];
    updatedTabs.splice(index, 1);
    
    const updatedSearchConfig = { ...config.searchConfig || {} };
    if (updatedSearchConfig) {
      const { [removedTab.value]: _, ...rest } = updatedSearchConfig;
      
      updateConfig({
        tabs: updatedTabs,
        searchConfig: rest
      });
    }
    
    if (activeTab === removedTab.value && updatedTabs.length > 0) {
      setActiveTab(updatedTabs[0].value);
    }
  };

  const startEditing = (index: number, field: 'label' | 'value') => {
    setEditingTab({
      index,
      field,
      value: tabs[index][field]
    });
  };

  const updateEditingValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingTab) {
      setEditingTab({
        ...editingTab,
        value: e.target.value
      });
    }
  };

  const saveEditingTab = () => {
    if (editingTab) {
      const updatedTabs = [...tabs];
      
      // If we're editing the value (which is the key in searchConfig)
      if (editingTab.field === 'value' && updatedTabs[editingTab.index].value !== editingTab.value) {
        const oldValue = updatedTabs[editingTab.index].value;
        updatedTabs[editingTab.index][editingTab.field] = editingTab.value;
        
        // Update the searchConfig keys
        const updatedSearchConfig = { ...config.searchConfig || {} };
        
        updatedSearchConfig[editingTab.value] = updatedSearchConfig[oldValue] || [];
        delete updatedSearchConfig[oldValue];
        
        updateConfig({
          tabs: updatedTabs,
          searchConfig: updatedSearchConfig
        });
        
        // Update activeTab if it was the one being edited
        if (activeTab === oldValue) {
          setActiveTab(editingTab.value);
        }
      } else {
        // Just updating the label
        updatedTabs[editingTab.index][editingTab.field] = editingTab.value;
        updateConfig({ tabs: updatedTabs });
      }
      
      setEditingTab(null);
    }
  };

  const cancelEditing = () => {
    setEditingTab(null);
  };

  const handleTabSelect = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  const generateTabValue = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-');
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setNewTabLabel(label);
    // Auto-generate value from label if value is empty
    if (!newTabValue) {
      setNewTabValue(generateTabValue(label));
    }
  };

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add new tab form */}
            <div className="space-y-4 border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
              <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Add New Tab</h3>
              <div className="space-y-2">
                <Label htmlFor="tabLabel" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Tab Label
                </Label>
                <Input
                  id="tabLabel"
                  placeholder="e.g. Hotels"
                  value={newTabLabel}
                  onChange={handleLabelChange}
                  className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tabValue" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Tab Value (ID)
                </Label>
                <Input
                  id="tabValue"
                  placeholder="e.g. hotels"
                  value={newTabValue}
                  onChange={(e) => setNewTabValue(e.target.value)}
                  className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  A unique identifier for this tab. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <Button 
                onClick={handleAddTab} 
                disabled={!newTabLabel || !newTabValue}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Tab
              </Button>
            </div>

            {/* List of tabs */}
            <div className="space-y-4 border border-zinc-200 dark:border-zinc-700 rounded-md p-4">
              <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Configured Tabs</h3>
              {tabs.length === 0 ? (
                <div className="flex items-center justify-center h-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
                  <p className="text-zinc-500 dark:text-zinc-400">No tabs added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tabs.map((tab, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-md ${
                        activeTab === tab.value 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex flex-col flex-grow min-w-0">
                        {editingTab && editingTab.index === index && editingTab.field === 'label' ? (
                          <div className="flex items-center">
                            <Input
                              value={editingTab.value}
                              onChange={updateEditingValue}
                              className="h-8 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={saveEditingTab}
                              className="ml-1 h-8 w-8 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="ml-1 h-8 w-8 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Badge 
                              variant={activeTab === tab.value ? "default" : "outline"}
                              className={activeTab === tab.value 
                                ? "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                                : "text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
                              }
                              onClick={() => handleTabSelect(tab.value)}
                            >
                              {tab.label}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditing(index, 'label')}
                              className="ml-1 h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                              <EditIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {editingTab && editingTab.index === index && editingTab.field === 'value' ? (
                          <div className="flex items-center mt-1">
                            <Input
                              value={editingTab.value}
                              onChange={updateEditingValue}
                              className="h-8 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={saveEditingTab}
                              className="ml-1 h-8 w-8 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="ml-1 h-8 w-8 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="truncate">ID: {tab.value}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditing(index, 'value')}
                              className="ml-1 h-5 w-5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                              <EditIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTab(index)}
                        className="ml-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 