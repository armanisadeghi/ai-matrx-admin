'use client';
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { Search, Plus, Grid, List, ArrowUpDown, RefreshCw, LayersIcon, SquareStackIcon, BoxIcon, PackageIcon, BoxesIcon,
  LayoutGridIcon, Boxes, LayoutPanelTopIcon, LayoutTemplateIcon, FolderKanbanIcon, PanelTopIcon, TablePropertiesIcon, 
  TableIcon, BoxSelectIcon, TriangleIcon, CircleIcon, SquareIcon, DiamondIcon, PanelsTopLeftIcon, ArrowUpRightSquareIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAppDispatch, useAppSelector, useAppStore } from '@/lib/redux';
import { fetchContainersThunk } from '@/lib/redux/app-builder/thunks/containerBuilderThunks';
import { 
  selectAllContainers, 
  selectContainerLoading, 
  selectContainerError,
  selectContainersByIds 
} from '@/lib/redux/app-builder/selectors/containerSelectors';
import { ComponentGroup } from '@/types/customAppTypes';
import { RootState } from '@/lib/redux';

// Define type for groupIds
type GroupId = string;

// Define and export the ref type
export type SmartContainerListRefType = {
  refresh: (specificGroupIds?: string[]) => Promise<ComponentGroup[]>;
};

/**
 * A modern, standalone SmartContainerList component that fetches and displays component groups
 * @param {Object} props
 * @param {Function} props.onSelectGroup - Callback when group is selected
 * @param {boolean} props.showCreateButton - Whether to show the create button
 * @param {Function} props.onCreateGroup - Callback when create button is clicked
 * @param {Function} props.onRefreshGroup - Callback when refresh button is clicked for a specific group
 * @param {Function} props.onDeleteGroup - Callback when delete button is clicked for a specific group
 * @param {Function} props.onEditGroup - Callback when edit button is clicked for a specific group
 * @param {string} props.className - Additional CSS classes
 * @param {string[]} props.groupIds - Optional list of group IDs to fetch and display
 * @param {Function} props.onRefreshComplete - Optional callback when refresh completes
 */
const SmartContainerList = forwardRef<SmartContainerListRefType, {
  onSelectGroup?: (group: ComponentGroup) => void, 
  showCreateButton?: boolean, 
  onCreateGroup?: () => void,
  onRefreshGroup?: (group: ComponentGroup) => void,
  onDeleteGroup?: (group: ComponentGroup) => void,
  onEditGroup?: (group: ComponentGroup) => void,
  className?: string,
  groupIds?: string[],
  onRefreshComplete?: (groups: ComponentGroup[]) => void
}>(({ 
  onSelectGroup, 
  showCreateButton = true, 
  onCreateGroup,
  onRefreshGroup,
  onDeleteGroup,
  onEditGroup,
  className = '',
  groupIds,
  onRefreshComplete
}, ref) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  
  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('label-asc'); // 'label-asc', 'label-desc', 'fields-asc', 'fields-desc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Redux state
  const allContainers = useAppSelector(selectAllContainers);
  const isLoading = useAppSelector(selectContainerLoading);
  const error = useAppSelector(selectContainerError);
  
  // Derived state - create a memoized selector function
  const selectGroups = React.useCallback(
    (state: RootState) => {
      if (groupIds && groupIds.length > 0) {
        return selectContainersByIds(state, groupIds);
      } else {
        return allContainers;
      }
    },
    [groupIds, allContainers]
  );

  // Use the memoized selector
  const groups = useAppSelector(selectGroups);
  
  // Apply filters and sorting to groups from Redux
  const filteredGroups = React.useMemo(() => {
    let result = [...groups];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowercaseTerm = searchTerm.toLowerCase();
      result = result.filter(group => 
        group.label?.toLowerCase().includes(lowercaseTerm) || 
        group.description?.toLowerCase().includes(lowercaseTerm) ||
        group.id?.toLowerCase().includes(lowercaseTerm) ||
        group.shortLabel?.toLowerCase().includes(lowercaseTerm)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'label-asc':
        result.sort((a, b) => a.label?.localeCompare(b.label));
        break;
      case 'label-desc':
        result.sort((a, b) => b.label?.localeCompare(a.label));
        break;
      case 'fields-asc':
        result.sort((a, b) => (a.fields?.length || 0) - (b.fields?.length || 0));
        break;
      case 'fields-desc':
        result.sort((a, b) => (b.fields?.length || 0) - (a.fields?.length || 0));
        break;
      default:
        break;
    }
    
    return result;
  }, [groups, searchTerm, sortBy]);

  // Initial data fetch
  useEffect(() => {
    // Fetch containers regardless of whether we have them already, as we need to ensure the store is updated
    dispatch(fetchContainersThunk());
  }, [dispatch]); // Don't include allContainers.length or groupIds in dependencies

  // Create a refresh function using useRef to always access the latest implementation
  const refreshRef = useRef<(specificGroupIds?: string[]) => Promise<ComponentGroup[]>>(null!);

  // Expose the refresh method via ref
  useImperativeHandle(ref, () => {
    // Create the function once
    const refreshFn = async (specificGroupIds?: string[]) => {
      setIsRefreshing(true);
      try {
        // Use specificGroupIds if provided, otherwise use the component's groupIds
        const groupsToRefresh = specificGroupIds || groupIds;
        await dispatch(fetchContainersThunk()).unwrap();
        
        // Get the current state immediately after the fetch
        const currentState = store.getState();
        const currentAllContainers = selectAllContainers(currentState);
        const currentGroups = groupsToRefresh 
          ? selectContainersByIds(currentState, groupsToRefresh) 
          : currentAllContainers;
        
        // Call the callback if provided
        if (onRefreshComplete) {
          onRefreshComplete(currentGroups);
        }
        
        return currentGroups;
      } catch (error) {
        toast({
          title: "Refresh Failed",
          description: "Could not refresh group data",
          variant: "destructive",
        });
        return [];
      } finally {
        setIsRefreshing(false);
      }
    };
    
    // Store the function in our ref for internal use
    refreshRef.current = refreshFn;
    
    // Return the interface
    return {
      refresh: refreshFn
    };
  }, [dispatch, toast, groupIds, store, onRefreshComplete, selectGroups]);

  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refreshRef.current();
    toast({
      title: "Refreshing",
      description: "Updating group list...",
    });
  };

  // Handle search term changes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle sort changes
  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  // Handle refresh for a specific group
  const handleRefreshGroup = (group: ComponentGroup, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card selection
    }
    
    if (onRefreshGroup) {
      onRefreshGroup(group);
    } else {
      // Instead of refreshing just one group, refresh all groups
      // A more targeted approach would require a specific thunk for single group refresh
      refreshRef.current();
      toast({
        title: "Group Refreshed",
        description: `Group "${group.label}" has been refreshed.`,
      });
    }
  };

  // Handle delete for a specific group
  const handleDeleteGroup = (group: ComponentGroup, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card selection
    }
    
    if (onDeleteGroup) {
      onDeleteGroup(group);
    }
  };

  // Handle edit for a specific group
  const handleEditGroup = (group: ComponentGroup, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card selection
    }
    
    if (onEditGroup) {
      onEditGroup(group);
    }
  };

  // Renders skeleton cards during loading state
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <Card key={`skeleton-${index}`} className="overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </Card>
    ));
  };

  // Add a function to generate varied container icons based on the group ID
  const getContainerIcon = (groupId: string) => {
    // List of possible icons
    const icons = [
      LayersIcon, SquareStackIcon, BoxIcon, PackageIcon, BoxesIcon, LayoutGridIcon, 
      Boxes, LayoutPanelTopIcon, LayoutTemplateIcon, FolderKanbanIcon, PanelTopIcon, 
      TablePropertiesIcon, TableIcon, BoxSelectIcon, TriangleIcon, CircleIcon, 
      SquareIcon, DiamondIcon, PanelsTopLeftIcon, ArrowUpRightSquareIcon
    ];
    
    // List of possible colors
    const colors = [
      'amber', 'orange', 'yellow', 'green', 'emerald', 'teal', 'cyan', 
      'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
    ];
    
    // Use the group ID to deterministically select an icon and color
    // This ensures the same group always gets the same icon and color
    const charSum = groupId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const iconIndex = charSum % icons.length;
    const colorIndex = (charSum * 13) % colors.length; // Use a different formula for color to reduce collisions
    
    const IconComponent = icons[iconIndex];
    const color = colors[colorIndex];
    
    // Generate tailwind classes for the icon and background
    const getColorClasses = (colorName: string) => {
      switch(colorName) {
        case 'amber':
          return { bg: 'bg-amber-100 dark:bg-amber-800/30', text: 'text-amber-600 dark:text-amber-300' };
        case 'orange':
          return { bg: 'bg-orange-100 dark:bg-orange-800/30', text: 'text-orange-600 dark:text-orange-300' };
        case 'yellow':
          return { bg: 'bg-yellow-100 dark:bg-yellow-800/30', text: 'text-yellow-600 dark:text-yellow-300' };
        case 'green':
          return { bg: 'bg-green-100 dark:bg-green-800/30', text: 'text-green-600 dark:text-green-300' };
        case 'emerald':
          return { bg: 'bg-emerald-100 dark:bg-emerald-800/30', text: 'text-emerald-600 dark:text-emerald-300' };
        case 'teal':
          return { bg: 'bg-teal-100 dark:bg-teal-800/30', text: 'text-teal-600 dark:text-teal-300' };
        case 'cyan':
          return { bg: 'bg-cyan-100 dark:bg-cyan-800/30', text: 'text-cyan-600 dark:text-cyan-300' };
        case 'blue':
          return { bg: 'bg-blue-100 dark:bg-blue-800/30', text: 'text-blue-600 dark:text-blue-300' };
        case 'indigo':
          return { bg: 'bg-indigo-100 dark:bg-indigo-800/30', text: 'text-indigo-600 dark:text-indigo-300' };
        case 'violet':
          return { bg: 'bg-violet-100 dark:bg-violet-800/30', text: 'text-violet-600 dark:text-violet-300' };
        case 'purple':
          return { bg: 'bg-purple-100 dark:bg-purple-800/30', text: 'text-purple-600 dark:text-purple-300' };
        case 'fuchsia':
          return { bg: 'bg-fuchsia-100 dark:bg-fuchsia-800/30', text: 'text-fuchsia-600 dark:text-fuchsia-300' };
        case 'pink':
          return { bg: 'bg-pink-100 dark:bg-pink-800/30', text: 'text-pink-600 dark:text-pink-300' };
        case 'rose':
          return { bg: 'bg-rose-100 dark:bg-rose-800/30', text: 'text-rose-600 dark:text-rose-300' };
        default:
          return { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-300' };
      }
    };
    
    const colorClasses = getColorClasses(color);
    
    return {
      Icon: IconComponent,
      colorClasses
    };
  };

  // Re-add the getColorClasses function that was removed
  const getColorClasses = (group: ComponentGroup) => {
    // Default to amber as primary color for groups
    const primaryColor = 'amber';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-textured';
    const defaultCardFooterBg = 'bg-gray-50 dark:bg-gray-800';
    const defaultDescriptionClass = 'text-gray-600 dark:text-gray-300';
    
    // Apply amber coloring
    let cardBgClass = 'bg-amber-50 dark:bg-amber-900/10';
    let cardFooterBgClass = 'bg-amber-100/50 dark:bg-amber-900/20';
    let titleClass = 'text-amber-900 dark:text-amber-300';
    let descriptionClass = 'text-amber-700 dark:text-amber-400';
    
    // Public groups get a different treatment
    if (group.isPublic) {
      cardBgClass = 'bg-emerald-50 dark:bg-emerald-900/10';
      cardFooterBgClass = 'bg-emerald-100/50 dark:bg-emerald-900/20';
      titleClass = 'text-emerald-900 dark:text-emerald-300';
      descriptionClass = 'text-emerald-700 dark:text-emerald-400';
    }
    
    // No fields gets a muted treatment
    if (!group.fields || group.fields.length === 0) {
      cardBgClass = 'bg-gray-50 dark:bg-gray-900/10';
      cardFooterBgClass = 'bg-gray-100/50 dark:bg-gray-900/20';
      titleClass = defaultTextClass;
      descriptionClass = defaultDescriptionClass;
    }
    
    return {
      cardBg: cardBgClass,
      cardFooterBg: cardFooterBgClass,
      titleClass,
      descriptionClass,
    };
  };

  // Show error state if Redux has an error
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg inline-block mb-4">
          <LayersIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Groups</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <Button 
          className="mt-4 bg-red-500 hover:bg-red-600 text-white"
          onClick={handleRefreshClick}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            className="pl-10 pr-4 py-2 border-gray-200 dark:border-gray-700 bg-textured"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleRefreshClick}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange('label-asc')}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('label-desc')}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('fields-desc')}>
                Most Fields
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('fields-asc')}>
                Least Fields
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'grid' ? 'bg-amber-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {showCreateButton && onCreateGroup && (
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              size="sm"
              onClick={onCreateGroup}
            >
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>
      </div>
      
      {/* Group cards */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-3'
      }>
        {isLoading ? (
          renderSkeletons()
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No groups found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm ? "Try a different search term" : "Create your first group to get started"}
            </p>
            {showCreateButton && onCreateGroup && (
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white mt-4"
                onClick={onCreateGroup}
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Group
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredGroups.map(group => {
              const colorClasses = getColorClasses(group);
              const iconData = getContainerIcon(group.id || '');
              const IconComponent = iconData.Icon;
              
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="h-full"
                >
                  <Card 
                    className={`
                      border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 h-full
                      ${viewMode === 'list' ? 'flex overflow-hidden' : 'overflow-hidden'}
                      ${colorClasses.cardBg}
                      cursor-pointer
                    `}
                    onClick={() => onSelectGroup && onSelectGroup(group)}
                  >
                    {viewMode === 'grid' && (
                      <div className={`h-24 w-full flex items-center justify-center ${iconData.colorClasses.bg}`}>
                        <div className={`h-12 w-12 ${iconData.colorClasses.text}`}>
                          <IconComponent className="h-full w-full" />
                        </div>
                      </div>
                    )}
                    
                    <div className={viewMode === 'list' ? 'flex-1' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          {viewMode === 'list' && (
                            <div className={`p-1.5 rounded-md ${iconData.colorClasses.bg}`}>
                              <IconComponent className={`h-5 w-5 ${iconData.colorClasses.text}`} />
                            </div>
                          )}
                          <CardTitle className={`text-lg font-medium truncate ${colorClasses.titleClass}`}>
                            {group.label || "No Label"}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className={`text-sm ${colorClasses.descriptionClass}`}>
                          <p className="mb-2 truncate">{group.description || "No Description"}</p>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Fields:</span> 
                              <span>{group.fields?.length || 0}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {group.isPublic && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                Public
                              </Badge>
                            )}
                            
                            {viewMode === 'list' && group.authenticatedRead && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                Auth Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                    
                    <CardFooter className={`
                      border-t border-gray-200 dark:border-gray-700 p-3
                      ${viewMode === 'list' ? 'w-48 border-l border-l-gray-200 dark:border-l-gray-700 flex items-center justify-center flex-col gap-2' : ''}
                    `}>
                      <div className="flex flex-col w-full gap-2">
                        {onSelectGroup && (
                          <Button
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onSelectGroup && onSelectGroup(group); }}
                          >
                            Select
                          </Button>
                        )}
                        
                        {onEditGroup && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditGroup(group, e)}
                            className="w-full bg-transparent border border-current hover:bg-opacity-10 font-bold text-gray-700 dark:text-gray-300"
                          >
                            Edit
                          </Button>
                        )}
                        
                        {onDeleteGroup && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteGroup(group, e)}
                            className="w-full bg-transparent border border-current hover:bg-opacity-10 font-bold text-red-500 dark:text-red-400"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      
      {/* Status footer */}
      {!isLoading && filteredGroups.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>
            Showing {filteredGroups.length} of {groups.length} groups
            {searchTerm && ` for "${searchTerm}"`}
          </span>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SmartContainerList.displayName = 'SmartContainerList';

export default SmartContainerList;