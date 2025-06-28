'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { workflowActions } from '@/lib/redux/workflow/slice';
import { update } from '@/lib/redux/workflow/thunks';
import { workflowSelectors } from '@/lib/redux/workflow/selectors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface WorkflowEditOverlayProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowEditOverlay({ workflowId, isOpen, onClose }: WorkflowEditOverlayProps) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(workflowSelectors.loading);
  const error = useAppSelector(workflowSelectors.error);

  // Individual field selectors
  const name = useAppSelector(workflowSelectors.name);
  const description = useAppSelector(workflowSelectors.description);
  const workflowType = useAppSelector(workflowSelectors.workflowType);
  const category = useAppSelector(workflowSelectors.category);
  const inputs = useAppSelector(workflowSelectors.inputs);
  const outputs = useAppSelector(workflowSelectors.outputs);
  const dependencies = useAppSelector(workflowSelectors.dependencies);
  const sources = useAppSelector(workflowSelectors.sources);
  const destinations = useAppSelector(workflowSelectors.destinations);
  const actions = useAppSelector(workflowSelectors.actions);
  const tags = useAppSelector(workflowSelectors.tags);
  const metadata = useAppSelector(workflowSelectors.metadata);
  const viewport = useAppSelector(workflowSelectors.viewport);
  const isActive = useAppSelector(workflowSelectors.isActive);
  const isDeleted = useAppSelector(workflowSelectors.isDeleted);
  const autoExecute = useAppSelector(workflowSelectors.autoExecute);
  const isPublic = useAppSelector(workflowSelectors.isPublic);
  const authenticatedRead = useAppSelector(workflowSelectors.authenticatedRead);
  const publicRead = useAppSelector(workflowSelectors.publicRead);
  const currentId = useAppSelector(workflowSelectors.id);
  const version = useAppSelector(workflowSelectors.version);
  const createdAt = useAppSelector(workflowSelectors.createdAt);
  const updatedAt = useAppSelector(workflowSelectors.updatedAt);

  const [jsonFields, setJsonFields] = useState({
    inputs: '',
    outputs: '',
    dependencies: '',
    sources: '',
    destinations: '',
    actions: '',
    tags: '',
    metadata: '',
    viewport: ''
  });

  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  // NO FETCHING - workflow is already loaded by the page

  // Initialize JSON fields when workflow data changes
  useEffect(() => {
    if (currentId === workflowId) {
      setJsonFields({
        inputs: inputs ? JSON.stringify(inputs, null, 2) : '',
        outputs: outputs ? JSON.stringify(outputs, null, 2) : '',
        dependencies: dependencies ? JSON.stringify(dependencies, null, 2) : '',
        sources: sources ? JSON.stringify(sources, null, 2) : '',
        destinations: destinations ? JSON.stringify(destinations, null, 2) : '',
        actions: actions ? JSON.stringify(actions, null, 2) : '',
        tags: tags ? JSON.stringify(tags, null, 2) : '',
        metadata: metadata ? JSON.stringify(metadata, null, 2) : '',
        viewport: viewport ? JSON.stringify(viewport, null, 2) : ''
      });
    }
  }, [currentId, workflowId, inputs, outputs, dependencies, sources, destinations, actions, tags, metadata, viewport]);

  const handleSave = async () => {
    try {
      // Validate and parse JSON fields
      const parsedJsonFields: Record<string, any> = {};
      const newJsonErrors: Record<string, string> = {};

      Object.entries(jsonFields).forEach(([key, value]) => {
        if (value.trim()) {
          try {
            parsedJsonFields[key] = JSON.parse(value);
          } catch (err) {
            newJsonErrors[key] = 'Invalid JSON format';
          }
        } else {
          parsedJsonFields[key] = null;
        }
      });

      setJsonErrors(newJsonErrors);

      if (Object.keys(newJsonErrors).length > 0) {
        toast({
          title: "Validation Error",
          description: "Please fix JSON formatting errors before saving.",
          variant: "destructive"
        });
        return;
      }

      // Prepare update data
      const updateData = {
        name: name,
        description: description,
        workflow_type: workflowType,
        category: category,
        is_active: isActive,
        is_deleted: isDeleted,
        auto_execute: autoExecute,
        is_public: isPublic,
        authenticated_read: authenticatedRead,
        public_read: publicRead,
        ...parsedJsonFields
      };

      await dispatch(update({ id: workflowId, updates: updateData })).unwrap();
      
      toast({
        title: "Success",
        description: "Workflow updated successfully."
      });
      
      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update workflow. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleJsonFieldChange = (field: string, value: string) => {
    setJsonFields(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (jsonErrors[field]) {
      setJsonErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderJsonField = (field: string, label: string, description?: string) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      <Textarea
        id={field}
        value={jsonFields[field]}
        onChange={(e) => handleJsonFieldChange(field, e.target.value)}
        placeholder={`Enter ${label.toLowerCase()} as JSON`}
        className={`min-h-[100px] font-mono text-sm ${
          jsonErrors[field] 
            ? 'border-red-500 dark:border-red-400' 
            : 'border-gray-300 dark:border-gray-600'
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
      />
      {jsonErrors[field] && (
        <p className="text-sm text-red-500 dark:text-red-400">{jsonErrors[field]}</p>
      )}
    </div>
  );

  if (!isOpen) return null;

  const isCurrentWorkflow = currentId === workflowId;
  const showContent = isCurrentWorkflow && !loading;
  const showLoadingState = loading || !isCurrentWorkflow;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[60vw] max-w-none h-[90vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col p-0">
        {showLoadingState && (
          <div className="flex items-center justify-center py-8 h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
              <span className="mt-2 block text-gray-600 dark:text-gray-300">(overlay) Loading workflow...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-8 h-full">
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md max-w-md">
              <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Workflow</h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  size="sm"
                  className="border-red-300 dark:border-red-600 text-red-700 dark:text-red-300"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  size="sm"
                  className="border-gray-300 dark:border-gray-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {showContent && (
          <Tabs defaultValue="basic" className="w-full h-full flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Edit Workflow
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    ID: {currentId}
                  </Badge>
                  {version && (
                    <Badge variant="outline" className="text-xs">
                      Version: {version}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Fixed Tabs Header */}
              <div className="mt-4">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger value="basic" className="text-sm">Basic Info</TabsTrigger>
                  <TabsTrigger value="data" className="text-sm">Data & Config</TabsTrigger>
                  <TabsTrigger value="permissions" className="text-sm">Permissions</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-sm">Advanced</TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Basic Information</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Essential workflow details and configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name *
                      </Label>
                                          <Input
                      id="name"
                      value={name}
                      onChange={(e) => dispatch(workflowActions.updateName(e.target.value))}
                      placeholder="Enter workflow name"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </Label>
                                          <Textarea
                      id="description"
                      value={description || ''}
                      onChange={(e) => dispatch(workflowActions.updateDescription(e.target.value || null))}
                      placeholder="Enter workflow description"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="workflow_type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Workflow Type
                        </Label>
                        <Input
                          id="workflow_type"
                          value={workflowType || ''}
                          onChange={(e) => dispatch(workflowActions.updateWorkflowType(e.target.value || null))}
                          placeholder="Enter workflow type"
                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Category
                        </Label>
                        <Input
                          id="category"
                          value={category || ''}
                          onChange={(e) => dispatch(workflowActions.updateCategory(e.target.value || null))}
                          placeholder="Enter category"
                          className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="space-y-4 mt-0">
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Data Configuration</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Configure inputs, outputs, dependencies, and other data structures
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {renderJsonField('inputs', 'Inputs', 'Define input mappings for the workflow')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('outputs', 'Outputs', 'Define output configurations for the workflow')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('dependencies', 'Dependencies', 'Define workflow dependencies')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('sources', 'Sources', 'Configure broker source configurations')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('destinations', 'Destinations', 'Configure broker destinations')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('actions', 'Actions', 'Define workflow actions')}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-0">
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Permissions & Visibility</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Configure workflow access and visibility settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Workflow</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Make this workflow publicly accessible</p>
                      </div>
                                          <Switch
                      checked={isPublic || false}
                      onCheckedChange={(checked) => dispatch(workflowActions.updateIsPublic(checked))}
                    />
                    </div>

                    <Separator className="bg-gray-200 dark:bg-gray-700" />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Authenticated Read</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow authenticated users to read this workflow</p>
                      </div>
                                          <Switch
                      checked={authenticatedRead || false}
                      onCheckedChange={(checked) => dispatch(workflowActions.updateAuthenticatedRead(checked))}
                    />
                    </div>

                    <Separator className="bg-gray-200 dark:bg-gray-700" />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Read</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow public read access to this workflow</p>
                      </div>
                                          <Switch
                      checked={publicRead || false}
                      onCheckedChange={(checked) => dispatch(workflowActions.updatePublicRead(checked))}
                    />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-0">
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Advanced Settings</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Advanced workflow configuration and metadata
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Enable or disable this workflow</p>
                        </div>
                                              <Switch
                        checked={isActive || false}
                        onCheckedChange={(checked) => dispatch(workflowActions.updateIsActive(checked))}
                      />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Execute</Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Automatically execute this workflow</p>
                        </div>
                                              <Switch
                        checked={autoExecute || false}
                        onCheckedChange={(checked) => dispatch(workflowActions.updateAutoExecute(checked))}
                      />
                      </div>
                    </div>

                    <Separator className="bg-gray-200 dark:bg-gray-700" />

                    {renderJsonField('tags', 'Tags', 'Add tags for organization and search')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('metadata', 'Metadata', 'Additional metadata for the workflow')}
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    {renderJsonField('viewport', 'Viewport', 'Viewport configuration for visual workflows')}
                  </CardContent>
                </Card>
              </TabsContent>
                        </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <>
                    Created: {new Date(createdAt).toLocaleDateString()} | 
                    Updated: {new Date(updatedAt).toLocaleDateString()}
                  </>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading || !showContent || !isCurrentWorkflow}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowEditOverlay; 