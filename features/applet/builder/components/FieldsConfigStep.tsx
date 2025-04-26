import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, XIcon, Settings2Icon, CheckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TabSearchConfig, GroupFieldConfig } from '../../runner/components/field-components/types';
import { FieldConfigForms } from './field-config-forms/FieldConfigForms';

interface FieldsConfigStepProps {
  searchConfig: TabSearchConfig;
  activeTab: string | null;
  activeGroup: string | null;
  setActiveTab: (tabValue: string) => void;
  setActiveGroup: (groupId: string) => void;
  addField: (field: GroupFieldConfig) => void;
}

// Helper function to generate UUID without the built-in uuid package
const generateBrokerId = () => {
  return uuidv4();
};

export const FieldsConfigStep: React.FC<FieldsConfigStepProps> = ({
  searchConfig,
  activeTab,
  activeGroup,
  setActiveTab,
  setActiveGroup,
  addField
}) => {
  const [tabs, setTabs] = useState<{value: string, label: string}[]>([]);
  const [newField, setNewField] = useState<Partial<GroupFieldConfig>>({
    brokerId: generateBrokerId(),
    label: '',
    placeholder: '',
    type: 'input',
    customConfig: {}
  });
  const [activeTabLabel, setActiveTabLabel] = useState<string>('');
  const [activeGroupLabel, setActiveGroupLabel] = useState<string>('');
  const [showCustomConfigDialog, setShowCustomConfigDialog] = useState(false);

  useEffect(() => {
    // Extract tab labels from searchConfig
    const extractedTabs = Object.keys(searchConfig).map(tabValue => {
      const firstGroup = searchConfig[tabValue]?.[0];
      return {
        value: tabValue,
        label: firstGroup ? `${tabValue.charAt(0).toUpperCase()}${tabValue.slice(1).replace(/-/g, ' ')}` : tabValue
      };
    });
    setTabs(extractedTabs);
    
    // Set active tab if it's not set and there are tabs available
    if (!activeTab && extractedTabs.length > 0) {
      setActiveTab(extractedTabs[0].value);
    }
  }, [searchConfig, activeTab, setActiveTab]);

  useEffect(() => {
    // Find the current active tab label
    if (activeTab) {
      const tab = tabs.find(t => t.value === activeTab);
      if (tab) {
        setActiveTabLabel(tab.label);
      }
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    // Find the current active group label
    if (activeTab && activeGroup && searchConfig[activeTab]) {
      const group = searchConfig[activeTab].find(g => g.id === activeGroup);
      if (group) {
        setActiveGroupLabel(group.label);
      }
    }
  }, [activeTab, activeGroup, searchConfig]);

  const fieldTypes = [
    { value: 'button', label: 'Button' },
    { value: 'select', label: 'Dropdown' },
    { value: 'input', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number Input' },
    { value: 'date', label: 'Date Picker' },
    { value: 'checkbox', label: 'Checkbox Group' },
    { value: 'radio', label: 'Radio Group' },
    { value: 'slider', label: 'Slider' },
    { value: 'multiselect', label: 'Multi-Select' }
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setActiveGroup(null);
  };

  const handleGroupChange = (value: string) => {
    setActiveGroup(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (value: string) => {
    setNewField(prev => ({
      ...prev,
      type: value as GroupFieldConfig['type'],
      customConfig: {} // Reset custom config when type changes
    }));
  };

  const handleCustomConfigChange = (customConfig: any) => {
    setNewField(prev => ({
      ...prev,
      customConfig
    }));
  };

  const handleAddField = () => {
    if (
      newField.brokerId && 
      newField.label && 
      newField.type
    ) {
      addField(newField as GroupFieldConfig);
      
      // Reset form
      setNewField({
        brokerId: generateBrokerId(),
        label: '',
        placeholder: '',
        type: 'input',
        customConfig: {}
      });
      
      setShowCustomConfigDialog(false);
    }
  };

  const getActiveGroups = () => {
    if (!activeTab) return [];
    return searchConfig[activeTab] || [];
  };

  const getGroupFields = () => {
    if (!activeTab || !activeGroup) return [];
    const group = searchConfig[activeTab]?.find(g => g.id === activeGroup);
    return group?.fields || [];
  };

  return (
    <div className="space-y-6">
      {Object.keys(searchConfig).length === 0 ? (
        <Card className="border border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No tabs or groups have been created yet. Please go back and add tabs and groups first.
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
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar Navigation */}
            <div className="col-span-12 md:col-span-3 space-y-4">
              <Card className="border border-zinc-200 dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                    Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 py-0">
                  <Accordion type="single" collapsible className="w-full">
                    {tabs.map((tab) => (
                      <AccordionItem key={tab.value} value={tab.value}>
                        <AccordionTrigger 
                          onClick={() => handleTabChange(tab.value)}
                          className={`px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            activeTab === tab.value 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {tab.label}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-4 border-l border-zinc-200 dark:border-zinc-700">
                            {searchConfig[tab.value]?.map((group) => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  setActiveTab(tab.value);
                                  setActiveGroup(group.id);
                                }}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded-md mb-1 ${
                                  activeTab === tab.value && activeGroup === group.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {group.label}
                                <span className="ml-2 text-xs opacity-70">
                                  ({group.fields.length})
                                </span>
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
              
              {/* Current Selection Info */}
              <Card className="border border-zinc-200 dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                    Current Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Tab:</span>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        {activeTabLabel || 'None selected'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Group:</span>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        {activeGroupLabel || 'None selected'}
                      </p>
                    </div>
                    {activeTab && activeGroup && (
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Fields:</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {getGroupFields().length} configured
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content */}
            <div className="col-span-12 md:col-span-9">
              {!activeTab || !activeGroup ? (
                <Card className="border border-zinc-200 dark:border-zinc-800">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Settings2Icon className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p className="text-center text-zinc-600 dark:text-zinc-400">
                      {!activeTab 
                        ? 'Please select a tab from the navigation menu'
                        : 'Please select a group from the navigation menu'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Add Field Form */}
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Add Field to {activeGroupLabel}
                      </CardTitle>
                      <CardDescription>
                        Configure a new field for this search group
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="brokerId" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Broker ID
                            </Label>
                            <Input
                              id="brokerId"
                              name="brokerId"
                              value={newField.brokerId}
                              onChange={handleInputChange}
                              className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              readOnly
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Unique identifier used to connect this field to the workflow system
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="label" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Field Label
                            </Label>
                            <Input
                              id="label"
                              name="label"
                              placeholder="e.g. First Name"
                              value={newField.label}
                              onChange={handleInputChange}
                              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="placeholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Placeholder Text
                            </Label>
                            <Input
                              id="placeholder"
                              name="placeholder"
                              placeholder="e.g. Enter your first name"
                              value={newField.placeholder}
                              onChange={handleInputChange}
                              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Field Type
                            </Label>
                            <Select
                              value={newField.type}
                              onValueChange={handleTypeChange}
                            >
                              <SelectTrigger className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Field Types</SelectLabel>
                                  {fieldTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Field Configuration
                            </Label>
                            <div className="flex">
                              <Dialog 
                                open={showCustomConfigDialog} 
                                onOpenChange={setShowCustomConfigDialog}
                              >
                                <DialogTrigger asChild>
                                  <Button 
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
                                  >
                                    <Settings2Icon className="h-4 w-4 mr-2" />
                                    Configure {newField.type} Options
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                  <DialogHeader>
                                    <DialogTitle>Configure {newField.type} Field</DialogTitle>
                                    <DialogDescription>
                                      Set up specific options for this field type
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="py-4">
                                    <FieldConfigForms
                                      fieldType={newField.type as GroupFieldConfig['type']}
                                      config={newField.customConfig || {}}
                                      onChange={handleCustomConfigChange}
                                    />
                                  </div>
                                  
                                  <DialogFooter>
                                    <Button 
                                      onClick={() => setShowCustomConfigDialog(false)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                                    >
                                      <CheckIcon className="h-4 w-4 mr-2" />
                                      Apply Configuration
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          
                          <div className="pt-4">
                            <Button
                              onClick={handleAddField}
                              disabled={!newField.brokerId || !newField.label || !newField.type}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Field
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* List of Fields */}
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Configured Fields
                      </CardTitle>
                      <CardDescription>
                        Fields for {activeGroupLabel} in the {activeTabLabel} tab
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getGroupFields().length > 0 ? (
                        <div className="space-y-4">
                          {getGroupFields().map((field, index) => (
                            <div 
                              key={field.brokerId}
                              className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                            >
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="font-medium text-zinc-800 dark:text-zinc-200">
                                    {field.label}
                                  </h3>
                                  <div className="flex items-center mt-1 space-x-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                                      {field.type}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      ID: {field.brokerId}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {field.placeholder && (
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  <span className="font-medium">Placeholder:</span> {field.placeholder}
                                </p>
                              )}
                              
                              {field.customConfig && Object.keys(field.customConfig).length > 0 && (
                                <div className="mt-3">
                                  <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="config">
                                      <AccordionTrigger className="text-xs text-zinc-600 dark:text-zinc-400 py-1">
                                        Custom Configuration
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <pre className="text-xs overflow-auto p-2 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 max-h-40">
                                          {JSON.stringify(field.customConfig, null, 2)}
                                        </pre>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-40 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
                          <p className="text-zinc-500 dark:text-zinc-400">No fields added yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 