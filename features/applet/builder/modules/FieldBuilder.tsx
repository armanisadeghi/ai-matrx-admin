'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, SaveIcon, FolderIcon, CheckIcon } from 'lucide-react';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GroupFieldConfig } from '@/features/applet/runner/components/field-components/types';
import { FieldConfigForms } from '../components/field-config-forms/FieldConfigForms';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';

const generateBrokerId = () => {
  return `broker-${uuidv4().substring(0, 8)}`;
};

export interface SavedField extends GroupFieldConfig {
  id: string; // Unique ID for the saved field
  createdAt: string;
  lastModified: string;
}

export const FieldBuilder = () => {
  const { toast } = useToast();
  const [newField, setNewField] = useState<Partial<GroupFieldConfig>>({
    brokerId: generateBrokerId(),
    label: '',
    placeholder: '',
    type: 'input',
    customConfig: {}
  });
  const [showCustomConfigDialog, setShowCustomConfigDialog] = useState(false);
  const [savedFields, setSavedFields] = useState<SavedField[]>([]);
  const [activeTab, setActiveTab] = useState<string>('create');
  const [selectedField, setSelectedField] = useState<SavedField | null>(null);

  // Mock field types
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

  // Load saved fields from localStorage on component mount
  useEffect(() => {
    const storedFields = localStorage.getItem('savedFields');
    if (storedFields) {
      try {
        setSavedFields(JSON.parse(storedFields));
      } catch (e) {
        console.error('Failed to parse saved fields', e);
      }
    }
  }, []);

  // Save fields to localStorage when they change
  useEffect(() => {
    localStorage.setItem('savedFields', JSON.stringify(savedFields));
  }, [savedFields]);

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

  const resetForm = () => {
    setNewField({
      brokerId: generateBrokerId(),
      label: '',
      placeholder: '',
      type: 'input',
      customConfig: {}
    });
    setShowCustomConfigDialog(false);
  };

  const saveField = () => {
    if (!newField.brokerId || !newField.label) {
      toast({
        title: "Validation Error",
        description: "Field ID and label are required",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const newSavedField: SavedField = {
      ...newField as GroupFieldConfig,
      id: uuidv4(),
      createdAt: now,
      lastModified: now
    };

    setSavedFields(prev => [...prev, newSavedField]);
    
    toast({
      title: "Field Saved",
      description: `Field "${newField.label}" has been saved successfully.`,
    });
    
    resetForm();
  };

  const editField = (field: SavedField) => {
    setSelectedField(field);
    setNewField({
      brokerId: field.brokerId,
      label: field.label,
      placeholder: field.placeholder,
      helpText: field.helpText,
      type: field.type,
      customConfig: field.customConfig,
      isRequired: field.isRequired
    });
    setActiveTab('create');
  };

  const updateField = () => {
    if (!selectedField) return;
    
    const updatedFields = savedFields.map(field => {
      if (field.id === selectedField.id) {
        return {
          ...field,
          ...newField as GroupFieldConfig,
          lastModified: new Date().toISOString()
        };
      }
      return field;
    });
    
    setSavedFields(updatedFields);
    setSelectedField(null);
    toast({
      title: "Field Updated",
      description: `Field "${newField.label}" has been updated successfully.`,
    });
    resetForm();
  };

  const deleteField = (id: string) => {
    setSavedFields(prev => prev.filter(field => field.id !== id));
    toast({
      title: "Field Deleted",
      description: "Field has been deleted successfully.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-rose-500 dark:text-rose-400">Broker Field Builder</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create and manage individual field components
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
              >
                Create Field
              </TabsTrigger>
              <TabsTrigger 
                value="saved"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
              >
                Saved Fields ({savedFields.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brokerId" className="text-gray-900 dark:text-gray-100">
                        Field ID
                      </Label>
                      <Input
                        id="brokerId"
                        name="brokerId"
                        value={newField.brokerId || ''}
                        onChange={handleInputChange}
                        placeholder="Enter field ID"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="label" className="text-gray-900 dark:text-gray-100">
                        Field Label
                      </Label>
                      <Input
                        id="label"
                        name="label"
                        value={newField.label || ''}
                        onChange={handleInputChange}
                        placeholder="Enter field label"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="placeholder" className="text-gray-900 dark:text-gray-100">
                        Placeholder
                      </Label>
                      <Input
                        id="placeholder"
                        name="placeholder"
                        value={newField.placeholder || ''}
                        onChange={handleInputChange}
                        placeholder="Enter placeholder text"
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-gray-900 dark:text-gray-100">
                        Field Type
                      </Label>
                      <Select value={newField.type} onValueChange={handleTypeChange}>
                        <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {fieldTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="helpText" className="text-gray-900 dark:text-gray-100">
                        Help Text
                      </Label>
                      <Textarea
                        id="helpText"
                        name="helpText"
                        value={newField.helpText || ''}
                        onChange={handleInputChange}
                        placeholder="Enter help text"
                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={() => setShowCustomConfigDialog(true)}
                      className="w-full mt-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      Configure Field Options
                    </Button>
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
                    onClick={selectedField ? updateField : saveField}
                    className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
                  >
                    {selectedField ? (
                      <><CheckIcon className="h-4 w-4 mr-2" /> Update Field</>
                    ) : (
                      <><SaveIcon className="h-4 w-4 mr-2" /> Save Field</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="saved" className="mt-6">
              {savedFields.length === 0 ? (
                <div className="text-center py-8">
                  <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No fields</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new field
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Field
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedFields.map(field => (
                    <Card key={field.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {field.label}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {field.brokerId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <p><span className="font-medium">Type:</span> {fieldTypes.find(t => t.value === field.type)?.label}</p>
                          {field.placeholder && <p><span className="font-medium">Placeholder:</span> {field.placeholder}</p>}
                          {field.helpText && <p className="truncate"><span className="font-medium">Help:</span> {field.helpText}</p>}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteField(field.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editField(field)}
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
      
      <Dialog open={showCustomConfigDialog} onOpenChange={setShowCustomConfigDialog}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Field Options</DialogTitle>
            <DialogDescription>
              Customize the settings for this field type
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
              variant="outline"
              onClick={() => setShowCustomConfigDialog(false)}
              className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowCustomConfigDialog(false)}
              className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
};

export default FieldBuilder; 