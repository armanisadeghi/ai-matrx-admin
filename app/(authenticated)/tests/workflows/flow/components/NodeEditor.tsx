'use client';

import React, { useState, useEffect } from 'react';
import { cloneDeep } from 'lodash';
import { 
  ArgumentOverride, 
  ArgumentMapping,
  WorkflowDependency,
  BaseNode, 
  registeredFunctions,
  validateNodeUpdate,
} from '../constants';
import { AppletSourceConfig } from '@/types/customAppTypes';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Settings, Info } from "lucide-react";
import { RecipeSelectionList } from "@/features/applet/builder/modules/recipe-source/RecipeSelectionList";

// Helper function to get the effective value for an argument
const getEffectiveArgValue = (
  arg: any, 
  argOverrides?: ArgumentOverride[]
): { value: any; ready: boolean } => {
  const override = argOverrides?.find(o => o.name === arg.name);
  return {
    value: override?.default_value ?? arg.default_value?.value ?? '',
    ready: override?.ready ?? arg.ready ?? false
  };
};

interface NodeEditorProps {
  node: BaseNode | null;
  onSave: (updatedNode: BaseNode) => void;
  onClose: () => void;
  open: boolean;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ 
  node, 
  onSave, 
  onClose,
  open 
}) => {
  const [editingNode, setEditingNode] = useState<BaseNode | null>(node);

  useEffect(() => {
    setEditingNode(node);
  }, [node]);

  if (!editingNode) return null;

  const functionData = registeredFunctions.find(f => f.id === editingNode.function_id);
  
  // Check if this is a recipe node (has recipe_id argument)
  const isRecipeNode = functionData?.args.some(arg => arg.name === 'recipe_id' || arg.name === 'version');
  
  // Get current recipe selection state
  const getRecipeIdValue = () => {
    const recipeOverride = editingNode.arg_overrides?.find(o => o.name === 'recipe_id');
    return recipeOverride?.default_value || '';
  };

  const getVersionValue = () => {
    const versionOverride = editingNode.arg_overrides?.find(o => o.name === 'version');
    return versionOverride?.default_value || '';
  };

  // Get current source config for RecipeSelectionList
  const getCurrentSourceConfig = (): AppletSourceConfig | undefined => {
    const recipeId = getRecipeIdValue();
    const version = getVersionValue();
    
    if (!recipeId && !version) return undefined;
    
    return {
      sourceType: "recipe",
      config: {
        id: recipeId || '',
        compiledId: recipeId || '',
        version: Number(version) || 1,
        neededBrokers: []
      }
    };
  };

  // Handle recipe selection
  const handleRecipeCompiledIdSelected = (compiledRecipeId: string) => {
    console.log('Recipe compiled ID selected:', compiledRecipeId);
    updateArgOverride('recipe_id', 'default_value', compiledRecipeId);
    updateArgOverride('recipe_id', 'ready', true);
  };

  const handleSourceConfigSelected = (sourceConfig: any) => {
    console.log('Source config selected:', sourceConfig);
    
    // Handle version if available
    if (sourceConfig?.config?.version) {
      const version = sourceConfig.config.version;
      
      if (version === 'latest') {
        // When version is "latest", set the latest_version boolean to true
        updateArgOverride('latest_version', 'default_value', true);
        updateArgOverride('latest_version', 'ready', true);
        
        // Keep version as "latest" or set to a default number - keeping as "latest" for now
        updateArgOverride('version', 'default_value', 'latest');
        updateArgOverride('version', 'ready', true);
      } else {
        // When version is a specific number, set latest_version to false
        updateArgOverride('latest_version', 'default_value', false);
        updateArgOverride('latest_version', 'ready', true);
        
        // Set the specific version number
        updateArgOverride('version', 'default_value', Number(version) || 1);
        updateArgOverride('version', 'ready', true);
      }
    }

    // Handle recipe_id from config if available
    if (sourceConfig?.config?.compiledId) {
      updateArgOverride('recipe_id', 'default_value', sourceConfig.config.compiledId);
      updateArgOverride('recipe_id', 'ready', true);
    }
    
    // Auto-add needed brokers as dependencies
    if (sourceConfig?.config?.neededBrokers?.length > 0) {
      const updated = cloneDeep(editingNode);
      if (!updated.additional_dependencies) updated.additional_dependencies = [];
      
      sourceConfig.config.neededBrokers.forEach((broker: any) => {
        // Check if this broker is already added
        const exists = updated.additional_dependencies?.some(dep => dep.source_broker_id === broker.id);
        if (!exists) {
          updated.additional_dependencies?.push({
            source_broker_id: broker.id,
            target_broker_id: '' // No target as specified
          });
        }
      });
      
      setEditingNode(updated);
    }
  };

  const handleRecipeConfigComplete = () => {
    // Recipe selection is complete, could switch to next tab or show confirmation
    console.log('Recipe configuration complete');
  };

  // Add callback for when recipe is initially selected
  const handleRecipeSelected = (recipeId: string) => {
    console.log('Recipe selected:', recipeId);
  };

  const handleSave = () => {
    if (editingNode) {
      try {
        validateNodeUpdate(editingNode);
        onSave(editingNode);
        onClose();
      } catch (error) {
        console.error('Validation error:', error);
        // You might want to show a toast or error message here
      }
    }
  };

  const updateArgOverride = (argName: string, field: keyof ArgumentOverride, value: any) => {
    if (!editingNode) return;
    
    const updated = cloneDeep(editingNode);
    if (!updated.arg_overrides) updated.arg_overrides = [];
    
    const existingIndex = updated.arg_overrides.findIndex(override => override.name === argName);
    
    if (existingIndex >= 0) {
      updated.arg_overrides[existingIndex] = {
        ...updated.arg_overrides[existingIndex],
        [field]: value
      };
    } else {
      const functionArg = functionData?.args.find(arg => arg.name === argName);
      updated.arg_overrides.push({
        name: argName,
        default_value: functionArg?.default_value?.value,
        ready: functionArg?.ready || false,
        [field]: value
      });
    }
    
    setEditingNode(updated);
  };

  const handleArgValueChange = (arg: any, inputValue: string) => {
    let value: any = inputValue;
    
    // Convert value based on data type
    if (arg.data_type === 'int') {
      value = inputValue ? parseInt(inputValue) || 0 : null;
    } else if (arg.data_type === 'bool') {
      value = inputValue.toLowerCase() === 'true';
    } else if (arg.data_type === 'float') {
      value = inputValue ? parseFloat(inputValue) || 0 : null;
    }
    // For string types, keep as is
    
    updateArgOverride(arg.name, 'default_value', value);
  };

  // Argument Mapping Functions
  const addArgumentMapping = () => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.arg_mapping) updated.arg_mapping = [];
    updated.arg_mapping.push({
      source_broker_id: '',
      target_arg_name: ''
    });
    setEditingNode(updated);
  };

  const updateArgumentMapping = (index: number, field: keyof ArgumentMapping, value: string) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.arg_mapping) return;
    updated.arg_mapping[index] = {
      ...updated.arg_mapping[index],
      [field]: value
    };
    setEditingNode(updated);
  };

  const removeArgumentMapping = (index: number) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.arg_mapping) return;
    updated.arg_mapping.splice(index, 1);
    setEditingNode(updated);
  };

  // Workflow Dependencies Functions
  const addWorkflowDependency = () => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];
    updated.additional_dependencies.push({
      source_broker_id: '',
      target_broker_id: ''
    });
    setEditingNode(updated);
  };

  const updateWorkflowDependency = (index: number, field: keyof WorkflowDependency, value: string) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies[index] = {
      ...updated.additional_dependencies[index],
      [field]: value
    };
    setEditingNode(updated);
  };

  const removeWorkflowDependency = (index: number) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies.splice(index, 1);
    setEditingNode(updated);
  };

  // Return Broker Overrides Functions
  const addReturnBrokerOverride = () => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.return_broker_overrides) updated.return_broker_overrides = [];
    updated.return_broker_overrides.push('');
    setEditingNode(updated);
  };

  const updateReturnBrokerOverride = (index: number, value: string) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides[index] = value;
    setEditingNode(updated);
  };

  const removeReturnBrokerOverride = (index: number) => {
    if (!editingNode) return;
    const updated = cloneDeep(editingNode);
    if (!updated.return_broker_overrides) return;
    updated.return_broker_overrides.splice(index, 1);
    setEditingNode(updated);
  };

  // Get broker info for display
  const getBrokerInfo = (brokerId: string) => {
    const sourceConfig = getCurrentSourceConfig();
    if (sourceConfig?.config?.neededBrokers) {
      return sourceConfig.config.neededBrokers.find((broker: any) => broker.id === brokerId);
    }
    return null;
  };

  // Determine tab layout
  const tabCount = isRecipeNode ? 6 : 5;
  const gridCols = isRecipeNode ? 'grid-cols-6' : 'grid-cols-5';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Node: {editingNode.step_name || 'Unnamed Step'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue={isRecipeNode ? "recipe" : "basic"} className="w-full h-full flex flex-col">
            <TabsList className={`grid w-full ${gridCols} flex-shrink-0`}>
              {isRecipeNode && <TabsTrigger value="recipe">Recipe</TabsTrigger>}
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="arguments">Arguments</TabsTrigger>
              <TabsTrigger value="mappings">Mappings</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="brokers">Brokers</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Recipe Selection Tab */}
              {isRecipeNode && (
                <TabsContent value="recipe" className="mt-4 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recipe Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                        <RecipeSelectionList
                          setCompiledRecipeId={handleRecipeCompiledIdSelected}
                          setRecipeSourceConfig={handleSourceConfigSelected}
                          onRecipeSelected={handleRecipeSelected}
                          initialSourceConfig={getCurrentSourceConfig()}
                          versionDisplay="card"
                          onConfirm={handleRecipeConfigComplete}
                        />
                      </div>
                      
                      {/* Show current selection */}
                      {getRecipeIdValue() && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">Recipe Selected</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p><strong>Recipe ID:</strong> <code className="bg-white dark:bg-gray-800 px-1 rounded">{getRecipeIdValue()}</code></p>
                            {getVersionValue() && (
                              <p><strong>Version:</strong> <code className="bg-white dark:bg-gray-800 px-1 rounded">{getVersionValue()}</code></p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Basic Settings Tab */}
              <TabsContent value="basic" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="step-name">Step Name</Label>
                        <Input
                          id="step-name"
                          value={editingNode.step_name || ''}
                          onChange={(e) => setEditingNode({ ...editingNode, step_name: e.target.value })}
                          placeholder="Enter step name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="function-type">Function Type</Label>
                        <Input
                          id="function-type"
                          value={editingNode.function_type || 'registered_function'}
                          onChange={(e) => setEditingNode({ ...editingNode, function_type: e.target.value })}
                          placeholder="Function type"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="execution-required"
                        checked={editingNode.execution_required || false}
                        onCheckedChange={(checked) => setEditingNode({ ...editingNode, execution_required: !!checked })}
                      />
                      <Label htmlFor="execution-required">Execution Required</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Function Info */}
                {functionData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Function: {functionData.func_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          Return Broker: <code className="bg-background px-1 py-0.5 rounded text-xs">{functionData.return_broker}</code>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Function ID: <code className="bg-background px-1 py-0.5 rounded text-xs">{functionData.id}</code>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Arguments Tab */}
              <TabsContent value="arguments" className="mt-4 space-y-6">
                {functionData && functionData.args.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Function Arguments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {functionData.args.map((arg) => {
                          const effective = getEffectiveArgValue(arg, editingNode.arg_overrides);
                          const argMappings = editingNode.arg_mapping?.filter(m => m.target_arg_name === arg.name) || [];
                          
                          return (
                            <Card key={arg.id} className="border-border">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{arg.name}</h4>
                                    <div className="flex gap-2">
                                      <Badge variant={arg.required ? "destructive" : "secondary"}>
                                        {arg.required ? 'Required' : 'Optional'}
                                      </Badge>
                                      <Badge variant="outline">{arg.data_type}</Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Default Value Section */}
                                  <div className="bg-muted/50 p-3 rounded-md space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Default Value</span>
                                      <span className="text-xs text-muted-foreground">* Directly enter a default value</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Value</Label>
                                        <Input
                                          value={String(effective.value)}
                                          onChange={(e) => handleArgValueChange(arg, e.target.value)}
                                          placeholder={`Enter ${arg.data_type} value`}
                                        />
                                      </div>
                                      
                                      <div className="flex items-center space-x-2 pt-6">
                                        <Checkbox
                                          id={`ready-${arg.id}`}
                                          checked={effective.ready}
                                          onCheckedChange={(checked) => updateArgOverride(arg.name, 'ready', !!checked)}
                                        />
                                        <Label htmlFor={`ready-${arg.id}`}>Ready</Label>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Broker Mapping Section */}
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Broker Mappings</span>
                                        <span className="text-xs text-muted-foreground">* Or map brokers to get this value during workflow</span>
                                      </div>
                                      <Button
                                        onClick={() => {
                                          if (!editingNode.arg_mapping) editingNode.arg_mapping = [];
                                          const newMapping = { source_broker_id: '', target_arg_name: arg.name };
                                          setEditingNode({
                                            ...editingNode,
                                            arg_mapping: [...editingNode.arg_mapping, newMapping]
                                          });
                                        }}
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Map Broker
                                      </Button>
                                    </div>
                                    
                                    {argMappings.length > 0 ? (
                                      <div className="space-y-2">
                                        {argMappings.map((mapping, mappingIndex) => {
                                          const globalIndex = editingNode.arg_mapping?.findIndex(m => 
                                            m.source_broker_id === mapping.source_broker_id && 
                                            m.target_arg_name === mapping.target_arg_name
                                          ) || 0;
                                          
                                          return (
                                            <div key={mappingIndex} className="flex items-center gap-2">
                                              <Input
                                                value={mapping.source_broker_id}
                                                onChange={(e) => updateArgumentMapping(globalIndex, 'source_broker_id', e.target.value)}
                                                placeholder="Enter source broker ID"
                                                className="font-mono text-xs"
                                              />
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeArgumentMapping(globalIndex)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          );
                                        })}
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          {argMappings.length} broker{argMappings.length !== 1 ? 's' : ''} mapped to this argument
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        No brokers mapped. Click "Map Broker" to add a source.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Argument Mappings Tab */}
              <TabsContent value="mappings" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Argument Mappings</CardTitle>
                      <Button onClick={addArgumentMapping} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mapping
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingNode.arg_mapping && editingNode.arg_mapping.length > 0 ? (
                      <div className="space-y-3">
                        {editingNode.arg_mapping.map((mapping, index) => (
                          <Card key={index} className="border-border">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                  <Label>Source Broker ID</Label>
                                  <Input
                                    value={mapping.source_broker_id}
                                    onChange={(e) => updateArgumentMapping(index, 'source_broker_id', e.target.value)}
                                    placeholder="Enter broker ID"
                                  />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <Label>Target Argument</Label>
                                  <Select 
                                    value={mapping.target_arg_name} 
                                    onValueChange={(value) => updateArgumentMapping(index, 'target_arg_name', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select argument" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {functionData?.args.map((arg) => (
                                        <SelectItem key={arg.id} value={arg.name}>
                                          {arg.name} ({arg.data_type})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeArgumentMapping(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No argument mappings configured. Click "Add Mapping" to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dependencies Tab */}
              <TabsContent value="dependencies" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Workflow Dependencies</CardTitle>
                      <Button onClick={addWorkflowDependency} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Dependency
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingNode.additional_dependencies && editingNode.additional_dependencies.length > 0 ? (
                      <div className="space-y-3">
                        {editingNode.additional_dependencies.map((dependency, index) => {
                          const brokerInfo = getBrokerInfo(dependency.source_broker_id);
                          
                          return (
                            <Card key={index} className="border-border">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 space-y-2">
                                      <Label>Source Broker ID</Label>
                                      <Input
                                        value={dependency.source_broker_id}
                                        onChange={(e) => updateWorkflowDependency(index, 'source_broker_id', e.target.value)}
                                        placeholder="Enter source broker ID"
                                      />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <Label>Target Broker ID (Optional)</Label>
                                      <Input
                                        value={dependency.target_broker_id || ''}
                                        onChange={(e) => updateWorkflowDependency(index, 'target_broker_id', e.target.value)}
                                        placeholder="Enter target broker ID"
                                      />
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => removeWorkflowDependency(index)}
                                      className="mt-6"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {/* Show broker info if available */}
                                  {brokerInfo && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Recipe Broker Info</span>
                                      </div>
                                      <div className="text-xs space-y-1">
                                        <p><strong>Name:</strong> {brokerInfo.name}</p>
                                        <p><strong>ID:</strong> <code className="bg-white dark:bg-gray-800 px-1 rounded">{brokerInfo.id}</code></p>
                                        <p className="text-blue-600 dark:text-blue-400">This broker was automatically added from the selected recipe</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No workflow dependencies configured. Click "Add Dependency" to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Return Broker Overrides Tab */}
              <TabsContent value="brokers" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Return Broker Overrides</CardTitle>
                      <Button onClick={addReturnBrokerOverride} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Override
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingNode.return_broker_overrides && editingNode.return_broker_overrides.length > 0 ? (
                      <div className="space-y-3">
                        {editingNode.return_broker_overrides.map((brokerId, index) => (
                          <Card key={index} className="border-border">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                  <Label>Broker ID</Label>
                                  <Input
                                    value={brokerId}
                                    onChange={(e) => updateReturnBrokerOverride(index, e.target.value)}
                                    placeholder="Enter broker ID"
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeReturnBrokerOverride(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No return broker overrides configured. Click "Add Override" to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeEditor; 