'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectContainerById, 
  selectContainerLoading,
  selectFieldsForContainer,
  selectContainerDirtyStatus
} from '@/lib/redux/app-builder/selectors/containerSelectors';
import { 
  setActiveContainer,
  setLabel,
  setShortLabel,
  setDescription,
  setHelpText,
  setHideDescription,
  setIsPublic,
  setAuthenticatedRead,
  setPublicRead
} from '@/lib/redux/app-builder/slices/containerBuilderSlice';
import { 
  fetchContainerByIdThunk,
  saveContainerThunk,
  addFieldThunk,
  removeFieldThunk,
  moveFieldUpThunk,
  moveFieldDownThunk
} from '@/lib/redux/app-builder/thunks/containerBuilderThunks';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  LayoutGrid, 
  AlertTriangle, 
  Info
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { FieldDefinition } from '@/features/applet/builder/builder.types';

export default function ContainerEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { toast } = useToast();
  
  // Local state for tabs
  const [activeTab, setActiveTab] = useState('properties');
  
  // Get container data from Redux
  const container = useAppSelector((state) => selectContainerById(state, id));
  const isLoading = useAppSelector(selectContainerLoading);
  const isDirty = useAppSelector((state) => selectContainerDirtyStatus(state, id));
  const containerFields = useAppSelector((state) => selectFieldsForContainer(state, id));
  
  // Determine if this is a new container
  const isCreatingNew = container?.isLocal === true;
  
  // Load container data when the component mounts
  useEffect(() => {
    const loadContainer = async () => {
      try {
        if (!container) {
          await dispatch(fetchContainerByIdThunk(id)).unwrap();
        }
        dispatch(setActiveContainer(id));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load container',
          variant: 'destructive',
        });
        router.push('/apps/app-builder/containers');
      }
    };
    
    loadContainer();
    
    return () => {
      // Clear active container when unmounting
      dispatch(setActiveContainer(null));
    };
  }, [id, dispatch, container, router, toast]);
  
  // Save handler (actual saving is handled by the layout)
  const handleSave = async () => {
    try {
      const savedContainer = await dispatch(saveContainerThunk(id)).unwrap();
      
      toast({
        title: 'Success',
        description: 'Container saved successfully',
      });
      
      router.push(`/apps/app-builder/containers/${savedContainer.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save container',
        variant: 'destructive',
      });
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    router.push(`/apps/app-builder/containers/${id}`);
  };
  
  // Property change handlers
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setLabel({ id, label: e.target.value }));
  };
  
  const handleShortLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setShortLabel({ id, shortLabel: e.target.value }));
  };
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setDescription({ id, description: e.target.value }));
  };
  
  const handleHelpTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setHelpText({ id, helpText: e.target.value }));
  };
  
  const handleHideDescriptionChange = (checked: boolean) => {
    dispatch(setHideDescription({ id, hideDescription: checked }));
  };
  
  const handleIsPublicChange = (checked: boolean) => {
    dispatch(setIsPublic({ id, isPublic: checked }));
  };
  
  const handleAuthenticatedReadChange = (checked: boolean) => {
    dispatch(setAuthenticatedRead({ id, authenticatedRead: checked }));
  };
  
  const handlePublicReadChange = (checked: boolean) => {
    dispatch(setPublicRead({ id, publicRead: checked }));
  };
  
  // Placeholder functions for field management (would need actual implementation)
  const handleAddField = () => {
    toast({
      title: 'Info',
      description: 'Field addition implementation needed',
    });
  };
  
  const handleRemoveField = (fieldId: string) => {
    dispatch(removeFieldThunk({ containerId: id, fieldId }));
  };
  
  const handleMoveFieldUp = (fieldId: string) => {
    dispatch(moveFieldUpThunk({ containerId: id, fieldId }));
  };
  
  const handleMoveFieldDown = (fieldId: string) => {
    dispatch(moveFieldDownThunk({ containerId: id, fieldId }));
  };
  
  if (isLoading || !container) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="w-full max-w-md mx-auto">
          <TabsTrigger value="properties">Container Properties</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {activeTab === 'properties' && (
        <Card>
          <CardHeader>
            <CardTitle>Container Properties</CardTitle>
            <CardDescription>
              Basic information about this container
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="label" className="font-medium">Container Name</Label>
              <Input 
                id="label" 
                placeholder="Enter container name" 
                value={container.label || ''} 
                onChange={handleLabelChange}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This will be the main identifier for your container.
              </p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="shortLabel" className="font-medium">Short Label (Optional)</Label>
              <Input 
                id="shortLabel" 
                placeholder="Short name for limited space contexts" 
                value={container.shortLabel || ''} 
                onChange={handleShortLabelChange}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A shorter name used in limited space contexts.
              </p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description" className="font-medium">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Enter a description for this container" 
                value={container.description || ''} 
                onChange={handleDescriptionChange}
                rows={3}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Describe the purpose of this container.
              </p>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="hideDescription" className="font-medium">Hide Description</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If enabled, the description will not be shown to users.
                </p>
              </div>
              <Switch 
                id="hideDescription"
                checked={container.hideDescription || false}
                onCheckedChange={handleHideDescriptionChange}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="helpText" className="font-medium">Help Text (Optional)</Label>
              <Textarea 
                id="helpText" 
                placeholder="Instructions or help text for users" 
                value={container.helpText || ''} 
                onChange={handleHelpTextChange}
                rows={2}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Provide additional guidance for users of this container.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'fields' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Container Fields</CardTitle>
                <CardDescription>
                  Manage the fields in this container
                </CardDescription>
              </div>
              <Button onClick={handleAddField} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {containerFields.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <LayoutGrid className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Fields Added</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                  This container doesn't have any fields yet.
                </p>
                <Button onClick={handleAddField}>
                  Add First Field
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containerFields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>{field.component}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {field.required ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Required
                          </Badge>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Optional</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveFieldUp(field.id)}
                            disabled={index === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveFieldDown(field.id)}
                            disabled={index === containerFields.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveField(field.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'permissions' && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Configure access control for this container
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic" className="font-medium">Public Container</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If enabled, this container will be available for use in multiple apps.
                </p>
              </div>
              <Switch 
                id="isPublic"
                checked={container.isPublic || false}
                onCheckedChange={handleIsPublicChange}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="authenticatedRead" className="font-medium">Authenticated Read</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If enabled, authenticated users can view this container.
                </p>
              </div>
              <Switch 
                id="authenticatedRead"
                checked={container.authenticatedRead || false}
                onCheckedChange={handleAuthenticatedReadChange}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="publicRead" className="font-medium">Public Read</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If enabled, anyone can view this container without authentication.
                </p>
              </div>
              <Switch 
                id="publicRead"
                checked={container.publicRead || false}
                onCheckedChange={handlePublicReadChange}
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">Access Control Info</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    These permissions control who can access this container and its fields. Public containers can be reused across
                    multiple apps, while private containers are specific to the app they're created in.
                  </p>
                </div>
              </div>
            </div>
            
            {container.isLocal && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300">Local Container</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      This container exists only locally and has not been saved to the server yet. Save the container to make it permanent.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isDirty}>
          {isCreatingNew ? 'Create' : 'Save'} Container
        </Button>
      </div>
      
      <Toaster />
    </div>
  );
} 