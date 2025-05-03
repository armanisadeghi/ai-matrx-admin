'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, XIcon, Settings2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
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
import { CustomAppletConfig, ComponentGroup, FieldDefinition, ComponentType, ComponentProps } from '@/features/applet/builder/builder.types';
import { FieldConfigForms } from './field-config-forms/FieldConfigForms';

interface FieldsConfigStepProps {
  applets: CustomAppletConfig[];
  activeApplet: string | null;
  activeGroup: string | null;
  setActiveApplet: (appletId: string) => void;
  setActiveGroup: (groupId: string) => void;
  addField: (fieldId: string, groupId: string) => Promise<void>;
  removeField: (fieldId: string, groupId: string) => Promise<void>;
}

// Helper function to generate UUID
const generateBrokerId = () => {
  return uuidv4();
};

export const FieldsConfigStep: React.FC<FieldsConfigStepProps> = ({
  applets,
  activeApplet,
  activeGroup,
  setActiveApplet,
  setActiveGroup,
  addField,
  removeField
}) => {
  const [newField, setNewField] = useState<Partial<FieldDefinition>>({
    id: generateBrokerId(),
    component: 'input' as ComponentType,
    label: '',
    placeholder: '',
    componentProps: {}
  });
  const [activeAppletName, setActiveAppletName] = useState<string>('');
  const [activeGroupLabel, setActiveGroupLabel] = useState<string>('');
  const [showCustomConfigDialog, setShowCustomConfigDialog] = useState(false);

  useEffect(() => {
    // Set active applet if it's not set and there are applets available
    if (!activeApplet && applets.length > 0) {
      setActiveApplet(applets[0].id);
    }
  }, [applets, activeApplet, setActiveApplet]);

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
    if (activeApplet && activeGroup) {
      const applet = applets.find(a => a.id === activeApplet);
      if (applet) {
        const container = applet.containers?.find(c => c.id === activeGroup);
        if (container) {
          setActiveGroupLabel(container.label);
        }
      }
    }
  }, [activeApplet, activeGroup, applets]);

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
      component: value as ComponentType,
      componentProps: {} // Reset custom config when type changes
    }));
  };

  const handleCustomConfigChange = (componentProps: ComponentProps) => {
    setNewField(prev => ({
      ...prev,
      componentProps
    }));
  };

  const handleAddField = () => {
    if (
      newField.id && 
      newField.label && 
      newField.component &&
      activeGroup
    ) {
      addField(newField.id, activeGroup);
      
      // Reset form
      setNewField({
        id: generateBrokerId(),
        component: 'input' as ComponentType,
        label: '',
        placeholder: '',
        componentProps: {}
      });
      
      setShowCustomConfigDialog(false);
    }
  };

  const getActiveGroups = () => {
    if (!activeApplet) return [];
    const applet = applets.find(a => a.id === activeApplet);
    return applet?.containers || [];
  };

  const getGroupFields = () => {
    if (!activeApplet || !activeGroup) return [];
    const applet = applets.find(a => a.id === activeApplet);
    if (!applet) return [];
    
    const container = applet.containers?.find(c => c.id === activeGroup);
    return container?.fields || [];
  };

  return (
    <div className="space-y-6">
      {applets.length === 0 ? (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No applets or groups have been created yet. Please go back and add applets and groups first.
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
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar Navigation */}
            <div className="col-span-12 md:col-span-3 space-y-4">
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 py-0">
                  <Accordion type="single" collapsible className="w-full">
                    {applets.map((applet) => (
                      <AccordionItem key={applet.id} value={applet.id}>
                        <AccordionTrigger 
                          onClick={() => handleAppletChange(applet.id)}
                          className={`px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            activeApplet === applet.id 
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' 
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {applet.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-4 border-l border-gray-200 dark:border-gray-700">
                            {applet.containers?.map((container) => (
                              <button
                                key={container.id}
                                onClick={() => {
                                  setActiveApplet(applet.id);
                                  handleGroupChange(container.id || '');
                                }}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded-md my-1 ${
                                  activeGroup === (container.id) && activeApplet === applet.id
                                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {container.label}
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

            {/* Main Content Area */}
            <div className="col-span-12 md:col-span-9 space-y-6">
              {activeApplet && activeGroup ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                        Fields for {activeAppletName} / {activeGroupLabel}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure the fields that will appear in this group
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add new field form */}
                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                          Add New Field
                        </CardTitle>
                        <CardDescription>
                          Create a new field for this group
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="label" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Field Label
                            </Label>
                            <Input
                              id="label"
                              name="label"
                              placeholder="e.g. First Name"
                              value={newField.label}
                              onChange={handleInputChange}
                              className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="placeholder" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Placeholder Text
                            </Label>
                            <Input
                              id="placeholder"
                              name="placeholder"
                              placeholder="e.g. Enter your first name"
                              value={newField.placeholder}
                              onChange={handleInputChange}
                              className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Field Type
                            </Label>
                            <Select value={newField.component} onValueChange={handleTypeChange}>
                              <SelectTrigger className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Field Types</SelectLabel>
                                  {fieldTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="pt-2 flex justify-between">
                            <Dialog open={showCustomConfigDialog} onOpenChange={setShowCustomConfigDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <Settings2 className="h-4 w-4 mr-2" />
                                  Advanced Settings
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Field Configuration</DialogTitle>
                                  <DialogDescription>
                                    Configure advanced settings for this {newField.component} field.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <FieldConfigForms 
                                    fieldType={newField.component || 'input'} 
                                    config={newField.componentProps || {}} 
                                    onChange={handleCustomConfigChange} 
                                  />
                                </div>
                                <DialogFooter>
                                  <Button 
                                    onClick={() => setShowCustomConfigDialog(false)}
                                    className="bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Apply Settings
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          
                            <Button
                              onClick={handleAddField}
                              disabled={!newField.label || !newField.component}
                              className="bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Field
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* List of fields */}
                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                          Configured Fields
                        </CardTitle>
                        <CardDescription>
                          Fields in this group
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {getGroupFields().length === 0 ? (
                          <div className="flex items-center justify-center h-32 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                            <p className="text-gray-500 dark:text-gray-400">No fields added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {getGroupFields().map((field, index) => (
                              <div 
                                key={field.id || index}
                                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center">
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{field.label}</h4>
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {field.component || 'input'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {field.placeholder || 'No placeholder'}
                                    </p>
                                  </div>
                                  
                                  <Button
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeField(field.id, activeGroup)}
                                    className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                                  >
                                    <XIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Alert>
                      <AlertTitle>No group selected</AlertTitle>
                      <AlertDescription>
                        Please select an applet and group from the sidebar to configure fields.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldsConfigStep; 