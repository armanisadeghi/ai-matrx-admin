'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  selectHasUnsavedChanges,
  selectDirtyFields,
  selectActiveFieldId
} from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { 
  startFieldCreation
} from '@/lib/redux/app-builder/slices/fieldBuilderSlice';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchFieldsThunk 
} from '@/lib/redux/app-builder/thunks/fieldBuilderThunks';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface FieldsLayoutProps {
  children: ReactNode;
}

export default function FieldsLayout({ children }: FieldsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Get global state from Redux
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedChanges);
  const dirtyFields = useAppSelector(selectDirtyFields);
  const activeFieldId = useAppSelector(selectActiveFieldId);
  
  // Load fields data when the component mounts
  useEffect(() => {
    loadFields();
  }, []);
  
  // Determine the current mode based on URL
  const determineCurrentMode = () => {
    if (pathname === '/apps/app-builder/fields') return 'list';
    if (pathname === '/apps/app-builder/fields/create') return 'create';
    if (pathname.includes('/edit')) return 'edit';
    if (pathname.includes('/apps/app-builder/fields/')) return 'view';
    return 'list';
  };

  const currentMode = determineCurrentMode();
  
  // Extract field ID from the path if we're in view or edit mode
  const getFieldIdFromPath = () => {
    if (currentMode === 'list' || currentMode === 'create') return null;
    const matches = pathname.match(/\/fields\/([^\/]+)/);
    return matches ? matches[1] : null;
  };
  
  const currentFieldId = getFieldIdFromPath();
  
  // Load fields from the API
  const loadFields = async () => {
    try {
      await dispatch(fetchFieldsThunk()).unwrap();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load fields",
        variant: "destructive"
      });
    }
  };
  
  // Handle creating a new field
  const handleCreateNew = () => {
    const newId = uuidv4();
    dispatch(startFieldCreation({ id: newId }));
    router.push(`/apps/app-builder/fields/${newId}/edit`);
  };
  
  // Handle refreshing the fields list
  const handleRefresh = () => {
    loadFields();
    toast({
      title: "Refreshed",
      description: "Fields list has been refreshed"
    });
  };

  // Navigation handlers for tabs
  const navigateToList = () => {
    router.push('/apps/app-builder/fields');
  };
  
  const navigateToCreate = () => {
    router.push('/apps/app-builder/fields/create');
  };
  
  const navigateToView = () => {
    if (currentFieldId) {
      router.push(`/apps/app-builder/fields/${currentFieldId}`);
    }
  };
  
  const navigateToEdit = () => {
    if (currentFieldId) {
      router.push(`/apps/app-builder/fields/${currentFieldId}/edit`);
    }
  };

  // Tab-specific content
  const renderTabs = () => {
    // If we're on the list view, show list and create tabs
    if (currentMode === 'list') {
      return (
        <Tabs value="list" className="w-full">
          <TabsList className="bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
            >
              All Fields
            </TabsTrigger>
            <TabsTrigger 
              value="create"
              onClick={navigateToCreate}
            >
              Create Field
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're viewing or editing a specific field, show all tabs
    if (currentMode === 'view' || currentMode === 'edit') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Fields
            </TabsTrigger>
            <TabsTrigger 
              value="view"
              onClick={navigateToView}
            >
              View Details
            </TabsTrigger>
            <TabsTrigger 
              value="edit"
              onClick={navigateToEdit}
            >
              Edit Field
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're creating a new field
    if (currentMode === 'create') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Fields
            </TabsTrigger>
            <TabsTrigger 
              value="create"
            >
              Create Field
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
  };

  // Define the base layout for all field operations
  return (
    <div className="flex flex-col space-y-4">
      <div className="pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Field Components</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage reusable form field components
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={navigateToCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Field
          </Button>
        </div>
      </div>
      
      {/* Contextual tabs based on current route */}
      {renderTabs()}

      {/* Status indicator for unsaved changes (global) */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-amber-800 dark:text-amber-300 text-sm">
          {dirtyFields.length === 1 ? (
            <p>You have 1 field with unsaved changes</p>
          ) : (
            <p>You have {dirtyFields.length} fields with unsaved changes</p>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-grow">
        {children}
      </div>
      
      {/* Global footer - if needed */}
      <div className="py-4 border-t border-gray-200 dark:border-gray-700 mt-6">
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push('/apps/app-builder')}>
            Back to App Builder
          </Button>
          
          {hasUnsavedChanges && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
              Remember to save your changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 