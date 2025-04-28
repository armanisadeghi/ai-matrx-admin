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
import { AvailableAppletConfigs, GroupFieldConfig } from '../../runner/components/field-components/types';
import { FieldConfigForms } from './field-config-forms/FieldConfigForms';

interface FieldsConfigStepProps {
  searchConfig: AvailableAppletConfigs;
  activeApplet: string | null;
  activeGroup: string | null;
  setActiveApplet: (appletId: string) => void;
  setActiveGroup: (groupId: string) => void;
  addField: (field: GroupFieldConfig) => void;
}

// Helper function to generate UUID without the built-in uuid package
const generateBrokerId = () => {
  return uuidv4();
};

export const FieldsConfigStep: React.FC<FieldsConfigStepProps> = ({
  searchConfig,
  activeApplet,
  activeGroup,
  setActiveApplet,
  setActiveGroup,
  addField
}) => {
  const [applets, setApplets] = useState<{id: string, name: string}[]>([]);
  const [newField, setNewField] = useState<Partial<GroupFieldConfig>>({
    brokerId: generateBrokerId(),
    label: '',
    placeholder: '',
    type: 'input',
    customConfig: {}
  });
  const [activeAppletName, setActiveAppletName] = useState<string>('');
  const [activeGroupLabel, setActiveGroupLabel] = useState<string>('');
  const [showCustomConfigDialog, setShowCustomConfigDialog] = useState(false);

  useEffect(() => {
    // Extract applet names from searchConfig
    const extractedApplets = Object.keys(searchConfig).map(appletId => {
      // Use the first group's data to try to get a name, or format the ID if no groups exist
      const firstGroup = searchConfig[appletId]?.[0];
      return {
        id: appletId,
        name: firstGroup ? `${appletId.charAt(0).toUpperCase()}${appletId.slice(1).replace(/-/g, ' ')}` : appletId
      };
    });
    setApplets(extractedApplets);
    
    // Set active applet if it's not set and there are applets available
    if (!activeApplet && extractedApplets.length > 0) {
      setActiveApplet(extractedApplets[0].id);
    }
  }, [searchConfig, activeApplet, setActiveApplet]);

  useEffect(() => {
    // Find the current active applet name
    if (activeApplet) {
      const applet = applets.find(a => a.id === activeApplet);
      if (applet) {
        setActiveAppletName(applet.name);
      }
    }
  }, [activeApplet, applets]);

  useEffect(() => {
    // Find the current active group label
    if (activeApplet && activeGroup && searchConfig[activeApplet]) {
      const group = searchConfig[activeApplet].find(g => g.id === activeGroup);
      if (group) {
        setActiveGroupLabel(group.label);
      }
    }
  }, [activeApplet, activeGroup, searchConfig]);

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

  const handleAppletChange = (value: string) => {
    setActiveApplet(value);
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
    if (!activeApplet) return [];
    return searchConfig[activeApplet] || [];
  };

  const getGroupFields = () => {
    if (!activeApplet || !activeGroup) return [];
    const group = searchConfig[activeApplet]?.find(g => g.id === activeGroup);
    return group?.fields || [];
  };

  return (
    <div className="space-y-6">
      {Object.keys(searchConfig).length === 0 ? (
        <Card className="border border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No applets or groups have been created yet. Please go back and add applets and groups first.
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
                    {applets.map((applet) => (
                      <AccordionItem key={applet.id} value={applet.id}>
                        <AccordionTrigger 
                          onClick={() => handleAppletChange(applet.id)}
                          className={`px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            activeApplet === applet.id 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {applet.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-4 border-l border-zinc-200 dark:border-zinc-700">
                            {searchConfig[applet.id]?.map((group) => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  setActiveApplet(applet.id);
                                  handleGroupChange(group.id);
                                }}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded-md my-1 ${
                                  activeGroup === group.id && activeApplet === applet.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {group.label}
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="col-span-12 md:col-span-9">
              {!activeApplet ? (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertTitle className="text-amber-800 dark:text-amber-300">
                    No Applet Selected
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Please select an applet from the navigation panel to configure fields.
                  </AlertDescription>
                </Alert>
              ) : !activeGroup ? (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertTitle className="text-amber-800 dark:text-amber-300">
                    No Group Selected
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Please select a group from the navigation panel to configure fields.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Add Field Form */}
                  <Card className="border border-zinc-200 dark:border-zinc-800 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Add Field to {activeGroupLabel}
                      </CardTitle>
                      <CardDescription>
                        Configure a new field for the {activeGroupLabel} group in {activeAppletName} applet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Label htmlFor="type" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Field Type
                            </Label>
                            <Select value={newField.type} onValueChange={handleTypeChange}>
                              <SelectTrigger className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                                <SelectValue placeholder="Select a field type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {fieldTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
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
                        
                        <div className="flex items-center justify-between">
                          <Dialog open={showCustomConfigDialog} onOpenChange={setShowCustomConfigDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <Settings2Icon className="h-4 w-4 mr-2" />
                                Configure Field Options
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Configure {newField.type} Field</DialogTitle>
                                <DialogDescription>
                                  Set up advanced options for this field type
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <FieldConfigForms
                                  fieldType={newField.type as GroupFieldConfig['type']}
                                  config={newField.customConfig}
                                  onChange={handleCustomConfigChange}
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => setShowCustomConfigDialog(false)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                                >
                                  Done
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            onClick={handleAddField}
                            disabled={!newField.label || !newField.type}
                            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Display of existing fields */}
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                        Fields in {activeGroupLabel}
                      </CardTitle>
                      <CardDescription>
                        The fields configured for this group
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getGroupFields().length === 0 ? (
                        <div className="flex items-center justify-center h-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
                          <p className="text-zinc-500 dark:text-zinc-400">No fields added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {getGroupFields().map((field, index) => (
                            <div
                              key={field.brokerId}
                              className="p-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-300 w-24 text-center">
                                    {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                                  </div>
                                  <h4 className="ml-3 font-medium text-zinc-800 dark:text-zinc-200">
                                    {field.label}
                                  </h4>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              {field.placeholder && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  Placeholder: {field.placeholder}
                                </p>
                              )}
                              {field.helpText && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  Help Text: {field.helpText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 