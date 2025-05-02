'use client';
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, Grid, List, ArrowUpDown, RefreshCw, LayersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { getAllComponentGroups, getComponentGroupById } from '@/lib/redux/app-builder/service';
import { ComponentGroup } from '@/features/applet/builder/builder.types';

// Define type for groupIds
type GroupId = string;

// Define and export the ref type
export type SmartGroupListRefType = {
  refresh: (specificGroupIds?: GroupId[]) => Promise<ComponentGroup[]>;
};

/**
 * A modern, standalone SmartGroupList component that fetches and displays component groups
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
const SmartGroupList = forwardRef<SmartGroupListRefType, {
  onSelectGroup: any, 
  showCreateButton?: boolean, 
  onCreateGroup: any,
  onRefreshGroup: any,
  onDeleteGroup: any,
  onEditGroup: any,
  className?: string,
  groupIds: any,
  onRefreshComplete: any
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
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ComponentGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('label-asc'); // 'label-asc', 'label-desc', 'fields-asc', 'fields-desc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref to store groupIds for comparison
  const prevGroupIdsRef = useRef<GroupId[] | undefined>(undefined);

  // Function to load all groups
  const loadAllGroups = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const fetchedGroups = await getAllComponentGroups();
      setGroups(fetchedGroups);
      setFilteredGroups(applyFiltersAndSort(fetchedGroups, searchTerm, sortBy));
      return fetchedGroups;
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Function to load specific groups by ID
  const loadGroupsByIds = useCallback(async (ids: GroupId[] | undefined, showLoading = true) => {
    if (!ids || ids.length === 0) return [];
    
    if (showLoading) setIsLoading(true);
    try {
      const groupPromises = ids.map(id => getComponentGroupById(id));
      const fetchedGroups = await Promise.all(groupPromises);
      // Filter out any null results (failed fetches)
      const validGroups = fetchedGroups.filter(group => group);
      
      setGroups(validGroups);
      setFilteredGroups(applyFiltersAndSort(validGroups, searchTerm, sortBy));
      return validGroups;
    } catch (error) {
      console.error('Failed to load specific groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Helper function to apply filters and sorting
  const applyFiltersAndSort = (groupList: ComponentGroup[], term: string, sort: string) => {
    // First apply search term filter
    let result = groupList;
    
    if (term.trim()) {
      const lowercaseTerm = term.toLowerCase();
      result = groupList.filter(group => 
        group.label?.toLowerCase().includes(lowercaseTerm) || 
        group.description?.toLowerCase().includes(lowercaseTerm) ||
        group.id?.toLowerCase().includes(lowercaseTerm) ||
        group.shortLabel?.toLowerCase().includes(lowercaseTerm)
      );
    }
    
    // Then apply sorting
    switch (sort) {
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
  };
  
  // Initial load
  useEffect(() => {
    if (groupIds && groupIds.length > 0) {
      loadGroupsByIds(groupIds);
      prevGroupIdsRef.current = [...groupIds];
    } else {
      loadAllGroups();
    }
  }, [loadAllGroups, loadGroupsByIds, groupIds]);
  
  // Watch for changes in groupIds prop
  useEffect(() => {
    const prevGroupIds = prevGroupIdsRef.current;
    
    // Check if groupIds has changed
    const hasChanged = () => {
      if (!prevGroupIds && groupIds) return true;
      if (prevGroupIds && !groupIds) return true;
      if (!prevGroupIds && !groupIds) return false;
      if (prevGroupIds.length !== groupIds?.length) return true;
      
      // Check if any ids are different - only run if groupIds exists
      return groupIds?.some(id => !prevGroupIds.includes(id)) || false;
    };
    
    if (hasChanged()) {
      if (groupIds && groupIds.length > 0) {
        loadGroupsByIds(groupIds);
      } else {
        loadAllGroups();
      }
      
      prevGroupIdsRef.current = groupIds ? [...groupIds] : undefined;
    }
  }, [groupIds, loadAllGroups, loadGroupsByIds]);

  // Handle search term changes
  useEffect(() => {
    setFilteredGroups(applyFiltersAndSort(groups, searchTerm, sortBy));
  }, [searchTerm, groups, sortBy]);

  // Handle sort changes
  useEffect(() => {
    setFilteredGroups(applyFiltersAndSort(groups, searchTerm, sortBy));
  }, [sortBy, groups, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  // Public refresh method for specific groups
  const refreshGroups = async (specificGroupIds?: GroupId[]) => {
    setIsRefreshing(true);
    try {
      let refreshedGroups;
      
      if (specificGroupIds && specificGroupIds.length > 0) {
        refreshedGroups = await loadGroupsByIds(specificGroupIds, false);
      } else if (groupIds && groupIds.length > 0) {
        refreshedGroups = await loadGroupsByIds(groupIds, false);
      } else {
        refreshedGroups = await loadAllGroups(false);
      }
      
      if (onRefreshComplete) {
        onRefreshComplete(refreshedGroups);
      }
      
      return refreshedGroups;
    } catch (error) {
      console.error('Error refreshing groups:', error);
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

  // Expose the refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshGroups
  }), [refreshGroups]);

  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refreshGroups();
    toast({
      title: "Refreshing",
      description: "Updating group list...",
    });
  };

  // Handle refresh for a specific group
  const handleRefreshGroup = (group: ComponentGroup, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card selection
    }
    
    if (onRefreshGroup) {
      onRefreshGroup(group);
    } else {
      refreshGroups([group.id]);
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

  // Get color classes based on group status
  const getColorClasses = (group: ComponentGroup) => {
    // Default to amber as primary color for groups
    const primaryColor = 'amber';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-white dark:bg-gray-800';
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            className="pl-10 pr-4 py-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
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
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
          
          {showCreateButton && (
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              size="sm"
              onClick={onCreateGroup}
            >
              <Plus className="h-4 w-4 mr-1" /> New
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
            {showCreateButton && (
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
                    <div className={viewMode === 'list' ? 'flex-1' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <LayersIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                          </div>
                          <CardTitle className={`text-lg font-medium ${colorClasses.titleClass}`}>
                            {group.label}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {group.id}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className={`text-sm ${colorClasses.descriptionClass}`}>
                          {group.description && (
                            <p className="mb-2 truncate">{group.description}</p>
                          )}
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Fields:</span> 
                              <span>{group.fields?.length || 0}</span>
                            </div>
                            
                            {group.fields && group.fields.length > 0 && viewMode === 'grid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleRefreshGroup(group, e)}
                                className="h-7 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                title="Refresh fields"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {group.isPublic && (
                              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                Public
                              </Badge>
                            )}
                            
                            {group.authenticatedRead && (
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                Auth Required
                              </Badge>
                            )}
                            
                            {group.hideDescription && (
                              <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800">
                                Hidden Description
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                    
                    <CardFooter className={`
                      border-t border-gray-200 dark:border-gray-700 p-3
                      ${colorClasses.cardFooterBg}
                      ${viewMode === 'list' ? 'w-48 border-l border-l-gray-200 dark:border-l-gray-700 flex items-center justify-center flex-col gap-2' : 'flex justify-between'}
                    `}>
                      {viewMode === 'list' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditGroup(group, e)}
                            className="w-full border-gray-300 dark:border-gray-600"
                          >
                            Edit
                          </Button>
                          
                          <Button
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onSelectGroup && onSelectGroup(group); }}
                          >
                            Select
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteGroup(group, e)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditGroup(group, e)}
                            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            Edit
                          </Button>
                        </>
                      )}
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
SmartGroupList.displayName = 'SmartGroupList';

export default SmartGroupList;