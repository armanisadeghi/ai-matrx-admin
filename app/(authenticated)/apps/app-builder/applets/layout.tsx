'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  selectHasUnsavedAppletChanges,
  selectDirtyApplets,
  selectActiveAppletId
} from '@/lib/redux/app-builder/selectors/appletSelectors';
import { 
  startNewApplet
} from '@/lib/redux/app-builder/slices/appletBuilderSlice';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchAppletsThunk 
} from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface AppletsLayoutProps {
  children: ReactNode;
}

export default function AppletsLayout({ children }: AppletsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Get global state from Redux
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppletChanges);
  const dirtyApplets = useAppSelector(selectDirtyApplets);
  const activeAppletId = useAppSelector(selectActiveAppletId);
  
  // Load applets data when the component mounts
  useEffect(() => {
    loadApplets();
  }, []);
  
  // Determine the current mode based on URL
  const determineCurrentMode = () => {
    if (pathname === '/apps/app-builder/applets') return 'list';
    if (pathname === '/apps/app-builder/applets/create') return 'create';
    if (pathname.includes('/edit')) return 'edit';
    if (pathname.includes('/apps/app-builder/applets/')) return 'view';
    return 'list';
  };

  const currentMode = determineCurrentMode();
  
  // Extract applet ID from the path if we're in view or edit mode
  const getAppletIdFromPath = () => {
    if (currentMode === 'list' || currentMode === 'create') return null;
    const matches = pathname.match(/\/applets\/([^\/]+)/);
    return matches ? matches[1] : null;
  };
  
  const currentAppletId = getAppletIdFromPath();
  
  // Load applets from the API
  const loadApplets = async () => {
    try {
      await dispatch(fetchAppletsThunk()).unwrap();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load applets",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to the create page for a new applet
  const navigateToCreate = () => {
    router.push('/apps/app-builder/applets/create');
  };
  
  // Handle creating a new applet directly
  const handleCreateNew = () => {
    const newId = uuidv4();
    dispatch(startNewApplet({ id: newId }));
    router.push(`/apps/app-builder/applets/${newId}/edit`);
  };
  
  // Handle refreshing the applets list
  const handleRefresh = () => {
    loadApplets();
    toast({
      title: "Refreshed",
      description: "Applets list has been refreshed"
    });
  };

  // Navigation handlers for tabs
  const navigateToList = () => {
    router.push('/apps/app-builder/applets');
  };
  
  const navigateToView = () => {
    if (currentAppletId) {
      router.push(`/apps/app-builder/applets/${currentAppletId}`);
    }
  };
  
  const navigateToEdit = () => {
    if (currentAppletId) {
      router.push(`/apps/app-builder/applets/${currentAppletId}/edit`);
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
              All Applets
            </TabsTrigger>
            <TabsTrigger 
              value="create"
              onClick={navigateToCreate}
            >
              Create Applet
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're viewing or editing a specific applet, show all tabs
    if (currentMode === 'view' || currentMode === 'edit') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Applets
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
              Edit Applet
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're creating a new applet
    if (currentMode === 'create') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Applets
            </TabsTrigger>
            <TabsTrigger 
              value="create"
            >
              Create Applet
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
  };

  // Define the base layout for all applet operations
  return (
    <div className="flex flex-col space-y-4">
      <div className="border-b pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">App Applets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage reusable interactive components for your apps
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={navigateToCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Applet
          </Button>
        </div>
      </div>
      
      {/* Contextual tabs based on current route */}
      {renderTabs()}

      {/* Status indicator for unsaved changes (global) */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-amber-800 dark:text-amber-300 text-sm">
          {dirtyApplets.length === 1 ? (
            <p>You have 1 applet with unsaved changes</p>
          ) : (
            <p>You have {dirtyApplets.length} applets with unsaved changes</p>
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