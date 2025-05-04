'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  selectHasUnsavedContainerChanges,
  selectDirtyContainers,
  selectActiveContainerId
} from '@/lib/redux/app-builder/selectors/containerSelectors';
import { 
  startNewContainer
} from '@/lib/redux/app-builder/slices/containerBuilderSlice';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchContainersThunk 
} from '@/lib/redux/app-builder/thunks/containerBuilderThunks';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ContainersLayoutProps {
  children: ReactNode;
}

export default function ContainersLayout({ children }: ContainersLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Get global state from Redux
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedContainerChanges);
  const dirtyContainers = useAppSelector(selectDirtyContainers);
  const activeContainerId = useAppSelector(selectActiveContainerId);
  
  // Load containers data when the component mounts
  useEffect(() => {
    loadContainers();
  }, []);
  
  // Determine the current mode based on URL
  const determineCurrentMode = () => {
    if (pathname === '/apps/app-builder/containers') return 'list';
    if (pathname === '/apps/app-builder/containers/create') return 'create';
    if (pathname.includes('/edit')) return 'edit';
    if (pathname.includes('/apps/app-builder/containers/')) return 'view';
    return 'list';
  };

  const currentMode = determineCurrentMode();
  
  // Extract container ID from the path if we're in view or edit mode
  const getContainerIdFromPath = () => {
    if (currentMode === 'list' || currentMode === 'create') return null;
    const matches = pathname.match(/\/containers\/([^\/]+)/);
    return matches ? matches[1] : null;
  };
  
  const currentContainerId = getContainerIdFromPath();
  
  // Load containers from the API
  const loadContainers = async () => {
    try {
      await dispatch(fetchContainersThunk()).unwrap();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load containers",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to the create page for a new container
  const navigateToCreate = () => {
    router.push('/apps/app-builder/containers/create');
  };
  
  // Handle creating a new container directly
  const handleCreateNew = () => {
    const newId = uuidv4();
    dispatch(startNewContainer({ id: newId }));
    router.push(`/apps/app-builder/containers/${newId}/edit`);
  };
  
  // Handle refreshing the containers list
  const handleRefresh = () => {
    loadContainers();
    toast({
      title: "Refreshed",
      description: "Containers list has been refreshed"
    });
  };

  // Navigation handlers for tabs
  const navigateToList = () => {
    router.push('/apps/app-builder/containers');
  };
  
  const navigateToView = () => {
    if (currentContainerId) {
      router.push(`/apps/app-builder/containers/${currentContainerId}`);
    }
  };
  
  const navigateToEdit = () => {
    if (currentContainerId) {
      router.push(`/apps/app-builder/containers/${currentContainerId}/edit`);
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
              All Containers
            </TabsTrigger>
            <TabsTrigger 
              value="create"
              onClick={navigateToCreate}
            >
              Create Container
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're viewing or editing a specific container, show all tabs
    if (currentMode === 'view' || currentMode === 'edit') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Containers
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
              Edit Container
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    
    // If we're creating a new container
    if (currentMode === 'create') {
      return (
        <Tabs value={currentMode} className="w-full">
          <TabsList className="w-full max-w-md mx-auto bg-transparent p-1 rounded-lg">
            <TabsTrigger 
              value="list"
              onClick={navigateToList}
            >
              All Containers
            </TabsTrigger>
            <TabsTrigger 
              value="create"
            >
              Create Container
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
  };

  // Define the base layout for all container operations
  return (
    <div className="flex flex-col space-y-4">
      <div className="border-b pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Field Containers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage reusable field groups and containers
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={navigateToCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Container
          </Button>
        </div>
      </div>
      
      {/* Contextual tabs based on current route */}
      {renderTabs()}

      {/* Status indicator for unsaved changes (global) */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 text-amber-800 dark:text-amber-300 text-sm">
          {dirtyContainers.length === 1 ? (
            <p>You have 1 container with unsaved changes</p>
          ) : (
            <p>You have {dirtyContainers.length} containers with unsaved changes</p>
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