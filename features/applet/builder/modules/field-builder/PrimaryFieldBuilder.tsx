'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FieldBuilder from './FieldBuilder';
import FieldRenderer from './FieldRenderer';
import { FieldDefinition, ComponentType, normalizeFieldDefinition } from '../../builder.types';
import { 
  getAllFieldComponents, 
  getFieldComponentById,
  createFieldComponent, 
  updateFieldComponent,
  deleteFieldComponent, 
  duplicateFieldComponent
} from '@/lib/redux/app-builder/service';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  FileIcon, 
  PlusIcon, 
  PencilIcon, 
  CopyIcon, 
  TrashIcon,
  SearchIcon 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

// Initial field definition with all basic properties
const createNewFieldDefinition = (): FieldDefinition => normalizeFieldDefinition({
  id: uuidv4(),
  label: "New Field Component",
  description: "Description of your field component",
  helpText: "Help text for your field component",
  component: "input" as ComponentType,
  placeholder: "Enter value here",
  required: false,
  disabled: false,
  group: "general",
  includeOther: false,
  options: [],
  defaultValue: "",
  componentProps: {}
});

const PrimaryFieldBuilder = () => {
  const { toast } = useToast();
  
  // State for field components
  const [components, setComponents] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for the current component being edited
  const [currentField, setCurrentField] = useState<FieldDefinition | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Preview state
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType | null>(null);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('list');
  
  // All available component types for the multi-component view
  const componentTypes: ComponentType[] = [
    'input', 
    'textarea', 
    'select', 
    'multiselect', 
    'radio', 
    'checkbox', 
    'slider', 
    'number', 
    'date',
    'switch',
    'button',
    'rangeSlider',
    'numberPicker',
    'jsonField',
    'fileUpload'
  ];

  // Load all components on initial render
  useEffect(() => {
    loadComponents();
  }, []);

  // Load components from the service
  const loadComponents = async () => {
    try {
      setLoading(true);
      const data = await getAllFieldComponents();
      setComponents(data);
      setError(null);
    } catch (err) {
      setError('Failed to load components');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new component
  const handleCreateNew = () => {
    setCurrentField(createNewFieldDefinition());
    setIsCreatingNew(true);
    setSelectedComponentType(null);
    setActiveTab('editor');
  };

  // Edit an existing component
  const handleEdit = async (id: string) => {
    try {
      setLoading(true);
      const component = await getFieldComponentById(id);
      if (component) {
        setCurrentField(component);
        setIsCreatingNew(false);
        setSelectedComponentType(null);
        setActiveTab('editor');
      } else {
        setError('Component not found');
        toast({
          title: "Error",
          description: "Component not found",
          variant: "destructive",
        });
      }
    } catch (err) {
      setError('Failed to load component');
      toast({
        title: "Error",
        description: "Failed to load component",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Save the current component
  const handleSave = async () => {
    if (!currentField) return;
    
    try {
      setIsSaving(true);
      let savedComponent;
      
      if (isCreatingNew) {
        savedComponent = await createFieldComponent(currentField);
        setComponents([...components, savedComponent]);
        toast({
          title: "Success",
          description: "Field component created successfully",
        });
      } else {
        savedComponent = await updateFieldComponent(currentField.id, currentField);
        setComponents(components.map(c => c.id === savedComponent.id ? savedComponent : c));
        toast({
          title: "Success",
          description: "Field component updated successfully",
        });
      }
      
      setCurrentField(savedComponent);
      setIsCreatingNew(false);
      setError(null);
    } catch (err: any) {
      // Extract the most useful error information
      let errorMessage = `Failed to ${isCreatingNew ? 'create' : 'update'} component`;
      
      if (err && err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      // Specifically handle Supabase errors which have a different structure
      if (err && err.error_description) {
        errorMessage += ` (${err.error_description})`;
      } else if (err && err.details) {
        errorMessage += ` (${err.details})`;
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('Error saving component:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setCurrentField(null);
    setActiveTab('list');
  };

  // Delete a component
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field component?')) return;
    
    try {
      await deleteFieldComponent(id);
      setComponents(components.filter(comp => comp.id !== id));
      if (currentField && currentField.id === id) {
        setCurrentField(null);
        setActiveTab('list');
      }
      toast({
        title: "Success",
        description: "Field component deleted successfully",
      });
    } catch (err) {
      setError('Failed to delete component');
      toast({
        title: "Error",
        description: "Failed to delete component",
        variant: "destructive",
      });
      console.error(err);
    }
  };

  // Duplicate a component
  const handleDuplicate = async (id: string) => {
    try {
      const newComponent = await duplicateFieldComponent(id);
      setComponents([...components, newComponent]);
      toast({
        title: "Success",
        description: "Field component duplicated successfully",
      });
    } catch (err) {
      setError('Failed to duplicate component');
      toast({
        title: "Error",
        description: "Failed to duplicate component",
        variant: "destructive",
      });
      console.error(err);
    }
  };

  // Helper function to add a new option with UUID
  const addNewOption = () => {
    if (!currentField) return;
    
    const newOption = {
      id: uuidv4(),
      label: "New Option",
      description: "",
      helpText: ""
    };
    
    setCurrentField({
      ...currentField,
      options: [...(currentField.options || []), newOption]
    });
  };

  // Filter components based on search term
  const filteredComponents = components.filter(comp => 
    comp.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.component.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-500 dark:text-blue-400">Field Components Manager</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Create, edit and manage field components for your applications
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="p-3 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="list"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                Component List
              </TabsTrigger>
              <TabsTrigger 
                value="editor"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                disabled={!currentField}
              >
                {isCreatingNew ? 'Create Component' : 'Edit Component'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="relative w-full md:w-auto">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search components..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full md:w-64"
                      />
                    </div>
                    <Button
                      onClick={handleCreateNew}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white w-full md:w-auto"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Component
                    </Button>
                  </div>

                  {filteredComponents.length === 0 ? (
                    <div className="text-center p-8 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <FileIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                        {searchTerm 
                          ? 'No components match your search' 
                          : 'You haven\'t created any field components yet'}
                      </p>
                      <Button
                        onClick={handleCreateNew}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Your First Component
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredComponents.map((component) => (
                        <Card 
                          key={component.id} 
                          className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {component.label}
                              </CardTitle>
                              <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                                {component.component}
                              </span>
                            </div>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {component.description}
                            </CardDescription>
                          </CardHeader>
                          
                          <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-2 mb-4">
                              {component.required && (
                                <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                                  Required
                                </span>
                              )}
                              {component.includeOther && (
                                <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                  Has "Other" option
                                </span>
                              )}
                              {component.group && component.group !== 'general' && (
                                <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 capitalize">
                                  {component.group}
                                </span>
                              )}
                            </div>
                          </CardContent>
                          
                          <CardFooter className="flex justify-between pt-0 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(component.id)}
                                className="border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <PencilIcon className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicate(component.id)}
                                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <CopyIcon className="h-3.5 w-3.5 mr-1" />
                                Duplicate
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(component.id)}
                              className="border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <TrashIcon className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="editor" className="mt-6">
              {currentField && (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left side: Field Builder */}
                  <div className="w-full lg:w-1/2">
                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          {isCreatingNew ? 'Create New Component' : 'Edit Component'}
                        </CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">
                          Configure your field component properties
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <FieldBuilder 
                          field={currentField} 
                          onChange={setCurrentField} 
                          onAddOption={addNewOption}
                        />
                      </CardContent>
                      
                      <CardFooter className="flex justify-end gap-3 pt-0 border-t border-gray-200 dark:border-gray-800">
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                        >
                          {isSaving ? 'Saving...' : isCreatingNew ? 'Create Component' : 'Update Component'}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                  
                  {/* Right side: Preview area */}
                  <div className="w-full lg:w-1/2">
                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          Component Preview
                        </CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">
                          Live preview of your field component
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        {/* Current component preview */}
                        <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm mb-6">
                          <h3 className="text-md font-semibold mb-3 capitalize text-gray-900 dark:text-gray-100">
                            {currentField.component} Component
                          </h3>
                          <FieldRenderer field={currentField} />
                        </div>
                        
                        {/* Component type selector */}
                        <div className="space-y-3">
                          <Label className="text-gray-900 dark:text-gray-100">
                            View As Different Component Type
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {componentTypes.map(type => (
                              <Button
                                key={type}
                                variant={selectedComponentType === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedComponentType(type)}
                                className={selectedComponentType === type
                                  ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                }
                              >
                                {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </Button>
                            ))}
                          </div>
                          
                          {selectedComponentType && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedComponentType(null)}
                              className="border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Clear Type Selection
                            </Button>
                          )}
                        </div>
                        
                        {/* Additional component view when a type is selected */}
                        {selectedComponentType && (
                          <div className="mt-6 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
                            <h3 className="text-md font-semibold mb-3 capitalize text-gray-900 dark:text-gray-100">
                              Rendered as {selectedComponentType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </h3>
                            <FieldRenderer 
                              field={{
                                ...currentField,
                                component: selectedComponentType
                              }} 
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Toaster />
    </div>
  );
};

export default PrimaryFieldBuilder; 