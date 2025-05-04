'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  selectHasUnsavedAppChanges,
  selectDirtyApps,
  selectActiveAppId
} from '@/lib/redux/app-builder/selectors/appSelectors';
import { 
  startNewApp
} from '@/lib/redux/app-builder/slices/appBuilderSlice';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchAppsThunk 
} from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface AppsLayoutProps {
  children: ReactNode;
}

export default function AppsLayout({ children }: AppsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Get global state from Redux
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppChanges);
  const dirtyApps = useAppSelector(selectDirtyApps);
  const activeAppId = useAppSelector(selectActiveAppId);
  
  // Load apps data when the component mounts
  useEffect(() => {
    loadApps();
  }, []);
  
  // Determine the current mode based on URL
  const determineCurrentMode = () => {
    if (pathname === '/apps/app-builder/apps') return 'list';
    if (pathname === '/apps/app-builder/apps/create') return 'create';
    if (pathname.includes('/edit')) return 'edit';
    if (pathname.includes('/apps/app-builder/apps/')) return 'view';
    return 'list';
  };

  const currentMode = determineCurrentMode();
  
  // Extract app ID from the path if we're in view or edit mode
  const getAppIdFromPath = () => {
    if (currentMode === 'list' || currentMode === 'create') return null;
    const matches = pathname.match(/\/apps\/([^\/]+)/);
    return matches ? matches[1] : null;
  };
  
  const currentAppId = getAppIdFromPath();
  
  // Load apps from the API
  const loadApps = async () => {
    try {
      await dispatch(fetchAppsThunk()).unwrap();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load apps",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to the create page for a new app
  const navigateToCreate = () => {
    router.push('/apps/app-builder/apps/create');
  };
  
  // Handle creating a new app directly
  const handleCreateNew = () => {
    const newId = uuidv4();
    dispatch(startNewApp({ id: newId }));
    router.push(`/apps/app-builder/apps/${newId}/edit`);
  };
  
  // Handle refreshing the apps list
  const handleRefresh = () => {
    loadApps();
    toast({
      title: "Refreshed",
      description: "Apps list has been refreshed"
    });
  };

  // Navigation handlers for tabs
  const navigateToList = () => {
    router.push('/apps/app-builder/apps');
  };
  
  const navigateToView = () => {
    if (currentAppId) {
      router.push(`/apps/app-builder/apps/${currentAppId}`);
    }
  };
  
  const navigateToEdit = () => {
    if (currentAppId) {
      router.push(`/apps/app-builder/apps/${currentAppId}/edit`);
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
              All Apps
            </TabsTrigger>
            <TabsTrigger 
              value="create"
              onClick={navigateToCreate}
            >
              Create App
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're viewing or editing a specific app, show all tabs
    if (currentMode === 'view' || currentMode === 'edit') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Apps
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
              Edit App
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're creating a new app
    if (currentMode === 'create') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Apps
            </TabsTrigger>
            <TabsTrigger 
              value="create"
            >
              Create App
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
  };

  // Define the base layout for all app operations
  return (
    <div className="flex flex-col space-y-4">
      <div className="border-b pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Application Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage complete applications for your users
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={navigateToCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New App
          </Button>
        </div>
      </div>
      
      {/* Contextual tabs based on current route */}
      {renderTabs()}

      {/* Status indicator for unsaved changes (global) */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-amber-800 dark:text-amber-300 text-sm">
          {dirtyApps.length === 1 ? (
            <p>You have 1 app with unsaved changes</p>
          ) : (
            <p>You have {dirtyApps.length} apps with unsaved changes</p>
          )}
        </div>
      )}
      
      {/* Main content */}
      <div>
        {children}
      </div>
    </div>
  );
} 