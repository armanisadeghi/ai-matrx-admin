'use client';
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, Filter, Grid, List, ArrowUpDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardFooter
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
import { getAllCustomAppConfigs, getCustomAppConfigById } from '@/features/applet/builder/service/customAppService';
import { IconPicker } from '@/components/ui/IconPicker';
import { COLOR_VARIANTS } from '@/features/applet/layouts/helpers/StyledComponents';
import { CustomAppConfig } from '@/features/applet/builder/modules/app-builder/AppBuilder';

// Define type for appIds
type AppId = string;

// Define SmartAppListRefType here as an exported type
export type SmartAppListRefType = {
  refresh: (specificAppIds?: AppId[]) => Promise<CustomAppConfig[]>;
};

/**
 * A modern, standalone AppList component that fetches and displays apps
 * @param {Object} props
 * @param {Function} props.onSelectApp - Callback when app is selected
 * @param {boolean} props.showCreateButton - Whether to show the create button
 * @param {Function} props.onCreateApp - Callback when create button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {string[]} props.appIds - Optional list of app IDs to fetch and display
 * @param {Function} props.onRefreshComplete - Optional callback when refresh completes
 */
const SmartAppList = forwardRef<SmartAppListRefType, {
  onSelectApp: any, 
  showCreateButton?: boolean, 
  onCreateApp: any,
  className?: string,
  appIds: any,
  onRefreshComplete: any
}>(({ 
  onSelectApp, 
  showCreateButton = true, 
  onCreateApp,
  className = '',
  appIds,
  onRefreshComplete
}, ref) => {
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref to store appIds for comparison - now with proper typing
  const prevAppIdsRef = useRef<AppId[] | undefined>(undefined);

  // Function to load all apps
  const loadAllApps = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const fetchedApps = await getAllCustomAppConfigs();
      setApps(fetchedApps);
      setFilteredApps(applyFiltersAndSort(fetchedApps, searchTerm, sortBy));
      return fetchedApps;
    } catch (error) {
      console.error('Failed to load apps:', error);
      toast({
        title: "Error",
        description: "Failed to load apps",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Function to load specific apps by ID
  const loadAppsByIds = useCallback(async (ids: AppId[] | undefined, showLoading = true) => {
    if (!ids || ids.length === 0) return [];
    
    if (showLoading) setIsLoading(true);
    try {
      const appPromises = ids.map(id => getCustomAppConfigById(id));
      const fetchedApps = await Promise.all(appPromises);
      // Filter out any null results (failed fetches)
      const validApps = fetchedApps.filter(app => app);
      
      setApps(validApps);
      setFilteredApps(applyFiltersAndSort(validApps, searchTerm, sortBy));
      return validApps;
    } catch (error) {
      console.error('Failed to load specific apps:', error);
      toast({
        title: "Error",
        description: "Failed to load apps",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Helper function to apply filters and sorting
  const applyFiltersAndSort = (appList, term, sort) => {
    // First apply search term filter
    let result = appList;
    
    if (term.trim()) {
      const lowercaseTerm = term.toLowerCase();
      result = appList.filter(app => 
        app.name?.toLowerCase().includes(lowercaseTerm) || 
        app.description?.toLowerCase().includes(lowercaseTerm) ||
        app.creator?.toLowerCase().includes(lowercaseTerm) ||
        app.slug?.toLowerCase().includes(lowercaseTerm)
      );
    }
    
    // Then apply sorting
    switch (sort) {
      case 'name-asc':
        result.sort((a, b) => a.name?.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name?.localeCompare(a.name));
        break;
      case 'date-asc':
        // Assuming there is a createdAt field, or use id as a fallback
        result.sort((a, b) => (a.createdAt || a.id)?.localeCompare(b.createdAt || b.id));
        break;
      case 'date-desc':
        result.sort((a, b) => (b.createdAt || b.id)?.localeCompare(a.createdAt || a.id));
        break;
      default:
        break;
    }
    
    return result;
  };
  
  // Initial load
  useEffect(() => {
    if (appIds && appIds.length > 0) {
      loadAppsByIds(appIds);
      prevAppIdsRef.current = [...appIds];
    } else {
      loadAllApps();
    }
  }, [loadAllApps, loadAppsByIds, appIds]);
  
  // Watch for changes in appIds prop
  useEffect(() => {
    const prevAppIds = prevAppIdsRef.current;
    
    // Check if appIds has changed
    const hasChanged = () => {
      if (!prevAppIds && appIds) return true;
      if (prevAppIds && !appIds) return true;
      if (!prevAppIds && !appIds) return false;
      if (prevAppIds.length !== appIds?.length) return true;
      
      // Check if any ids are different - only run if appIds exists
      return appIds?.some(id => !prevAppIds.includes(id)) || false;
    };
    
    if (hasChanged()) {
      if (appIds && appIds.length > 0) {
        loadAppsByIds(appIds);
      } else {
        loadAllApps();
      }
      
      prevAppIdsRef.current = appIds ? [...appIds] : undefined;
    }
  }, [appIds, loadAllApps, loadAppsByIds]);

  // Handle search term changes
  useEffect(() => {
    setFilteredApps(applyFiltersAndSort(apps, searchTerm, sortBy));
  }, [searchTerm, apps, sortBy]);

  // Handle sort changes
  useEffect(() => {
    setFilteredApps(applyFiltersAndSort(apps, searchTerm, sortBy));
  }, [sortBy, apps, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  // Public refresh method for specific apps
  const refreshApps = async (specificAppIds?: AppId[]) => {
    setIsRefreshing(true);
    try {
      let refreshedApps;
      
      if (specificAppIds && specificAppIds.length > 0) {
        refreshedApps = await loadAppsByIds(specificAppIds, false);
      } else if (appIds && appIds.length > 0) {
        refreshedApps = await loadAppsByIds(appIds, false);
      } else {
        refreshedApps = await loadAllApps(false);
      }
      
      if (onRefreshComplete) {
        onRefreshComplete(refreshedApps);
      }
      
      return refreshedApps;
    } catch (error) {
      console.error('Error refreshing apps:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh app data",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };

  // Expose the refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshApps
  }), [refreshApps]);

  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refreshApps();
    toast({
      title: "Refreshing",
      description: "Updating app list...",
    });
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

  // Get color classes based on app's primary color
  const getColorClasses = (app) => {
    const color = app.primaryColor || 'gray';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-white dark:bg-gray-800';
    const defaultCardFooterBg = 'bg-gray-50 dark:bg-gray-800';
    const defaultDescriptionClass = 'text-gray-600 dark:text-gray-300';
    
    // If we're using banner images, don't colorize
    if (viewMode === 'grid' && app.imageUrl) {
      return {
        cardBg: defaultCardBg,
        cardFooterBg: defaultCardFooterBg,
        titleClass: defaultTextClass,
        descriptionClass: defaultDescriptionClass,
      };
    }

    // If card has primaryColor, use that color's background variant
    if (color && COLOR_VARIANTS.background[color]) {
      // For light colored backgrounds, use dark text and vice versa
      const isDarkColor = [
        'blue', 'green', 'purple', 'red', 'slate', 'zinc', 'neutral', 
        'stone', 'emerald', 'teal', 'cyan', 'sky', 'violet', 'fuchsia'
      ].includes(color);
      
      const isVeryLightColor = ['white', 'gray'].includes(color);
      
      // Apply bg-{color}-100 for light mode and bg-{color}-900 for dark mode
      // NOTE: Using these specific classes to ensure they're included in the Tailwind bundle
      let cardBgClass;
      
      switch (color) {
        case 'gray': cardBgClass = 'bg-gray-100 dark:bg-gray-900'; break;
        case 'rose': cardBgClass = 'bg-rose-100 dark:bg-rose-900'; break;
        case 'blue': cardBgClass = 'bg-blue-100 dark:bg-blue-900'; break;
        case 'green': cardBgClass = 'bg-green-100 dark:bg-green-900'; break;
        case 'purple': cardBgClass = 'bg-purple-100 dark:bg-purple-900'; break;
        case 'yellow': cardBgClass = 'bg-yellow-100 dark:bg-yellow-900'; break;
        case 'red': cardBgClass = 'bg-red-100 dark:bg-red-900'; break;
        case 'orange': cardBgClass = 'bg-orange-100 dark:bg-orange-900'; break;
        case 'pink': cardBgClass = 'bg-pink-100 dark:bg-pink-900'; break;
        case 'slate': cardBgClass = 'bg-slate-100 dark:bg-slate-900'; break;
        case 'zinc': cardBgClass = 'bg-zinc-100 dark:bg-zinc-900'; break;
        case 'neutral': cardBgClass = 'bg-neutral-100 dark:bg-neutral-900'; break;
        case 'stone': cardBgClass = 'bg-stone-100 dark:bg-stone-900'; break;
        case 'amber': cardBgClass = 'bg-amber-100 dark:bg-amber-900'; break;
        case 'lime': cardBgClass = 'bg-lime-100 dark:bg-lime-900'; break;
        case 'emerald': cardBgClass = 'bg-emerald-100 dark:bg-emerald-900'; break;
        case 'teal': cardBgClass = 'bg-teal-100 dark:bg-teal-900'; break;
        case 'cyan': cardBgClass = 'bg-cyan-100 dark:bg-cyan-900'; break;
        case 'sky': cardBgClass = 'bg-sky-100 dark:bg-sky-900'; break;
        case 'violet': cardBgClass = 'bg-violet-100 dark:bg-violet-900'; break;
        case 'fuchsia': cardBgClass = 'bg-fuchsia-100 dark:bg-fuchsia-900'; break;
        default: cardBgClass = defaultCardBg;
      }
      
      // For footer, use a slightly darker shade
      let cardFooterBgClass;
      
      switch (color) {
        case 'gray': cardFooterBgClass = 'bg-gray-200 dark:bg-gray-800'; break;
        case 'rose': cardFooterBgClass = 'bg-rose-200 dark:bg-rose-800'; break;
        case 'blue': cardFooterBgClass = 'bg-blue-200 dark:bg-blue-800'; break;
        case 'green': cardFooterBgClass = 'bg-green-200 dark:bg-green-800'; break;
        case 'purple': cardFooterBgClass = 'bg-purple-200 dark:bg-purple-800'; break;
        case 'yellow': cardFooterBgClass = 'bg-yellow-200 dark:bg-yellow-800'; break;
        case 'red': cardFooterBgClass = 'bg-red-200 dark:bg-red-800'; break;
        case 'orange': cardFooterBgClass = 'bg-orange-200 dark:bg-orange-800'; break;
        case 'pink': cardFooterBgClass = 'bg-pink-200 dark:bg-pink-800'; break;
        case 'slate': cardFooterBgClass = 'bg-slate-200 dark:bg-slate-800'; break;
        case 'zinc': cardFooterBgClass = 'bg-zinc-200 dark:bg-zinc-800'; break;
        case 'neutral': cardFooterBgClass = 'bg-neutral-200 dark:bg-neutral-800'; break;
        case 'stone': cardFooterBgClass = 'bg-stone-200 dark:bg-stone-800'; break;
        case 'amber': cardFooterBgClass = 'bg-amber-200 dark:bg-amber-800'; break;
        case 'lime': cardFooterBgClass = 'bg-lime-200 dark:bg-lime-800'; break;
        case 'emerald': cardFooterBgClass = 'bg-emerald-200 dark:bg-emerald-800'; break;
        case 'teal': cardFooterBgClass = 'bg-teal-200 dark:bg-teal-800'; break;
        case 'cyan': cardFooterBgClass = 'bg-cyan-200 dark:bg-cyan-800'; break;
        case 'sky': cardFooterBgClass = 'bg-sky-200 dark:bg-sky-800'; break;
        case 'violet': cardFooterBgClass = 'bg-violet-200 dark:bg-violet-800'; break;
        case 'fuchsia': cardFooterBgClass = 'bg-fuchsia-200 dark:bg-fuchsia-800'; break;
        default: cardFooterBgClass = defaultCardFooterBg;
      }
      
      // Determine text color based on background
      const titleClass = isVeryLightColor 
        ? 'text-gray-900 dark:text-white'
        : !isDarkColor 
          ? 'text-gray-900 dark:text-white' 
          : 'text-white dark:text-white';
          
      const descriptionClass = isVeryLightColor
        ? 'text-gray-600 dark:text-gray-300'
        : !isDarkColor
          ? 'text-gray-700 dark:text-gray-200'
          : 'text-gray-100 dark:text-gray-200';
      
      return {
        cardBg: cardBgClass,
        cardFooterBg: cardFooterBgClass,
        titleClass,
        descriptionClass,
      };
    }
    
    // Default fallback
    return {
      cardBg: defaultCardBg,
      cardFooterBg: defaultCardFooterBg,
      titleClass: defaultTextClass,
      descriptionClass: defaultDescriptionClass,
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
            placeholder="Search apps..."
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
              <DropdownMenuItem onClick={() => handleSortChange('name-asc')}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('name-desc')}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('date-desc')}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('date-asc')}>
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {showCreateButton && (
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
              onClick={onCreateApp}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>
      </div>
      
      {/* App cards */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' 
          : 'space-y-3'
      }>
        {isLoading ? (
          renderSkeletons()
        ) : filteredApps.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No apps found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm ? "Try a different search term" : "Create your first app to get started"}
            </p>
            {showCreateButton && (
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white mt-4"
                onClick={onCreateApp}
              >
                <Plus className="h-4 w-4 mr-2" /> Create New App
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredApps.map(app => {
              const colorClasses = getColorClasses(app);
              
              return (
                <motion.div
                  key={app.id}
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
                    `}
                  >
                    {/* Banner image - only show in grid view */}
                    {viewMode === 'grid' && (
                      <div className="h-32 w-full relative">
                        {app.imageUrl ? (
                          <>
                            <img 
                              src={app.imageUrl} 
                              alt={app.name} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </>
                        ) : (
                          // Image placeholder with primaryColor background
                          <div className={`w-full h-full flex items-center justify-center
                            ${app.primaryColor ? `bg-${app.primaryColor}-300 dark:bg-${app.primaryColor}-800` : 'bg-gray-200 dark:bg-gray-700'}
                          `}>
                            <IconPicker
                              selectedIcon={app.mainAppIcon}
                              onIconSelect={() => {}}
                              className="w-12 h-12 opacity-20"
                              defaultIcon={app.mainAppIcon}
                              accentColor={app.accentColor}
                              iconType="appIcon"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <CardContent className={`
                      ${viewMode === 'list' ? 'flex-1 p-4' : 'p-4 pt-4'}
                      ${viewMode === 'grid' ? '-mt-8 relative' : ''}
                    `}>
                      <div className={`
                        flex items-center gap-3
                        ${viewMode === 'list' ? 'mb-1' : 'mb-3'}
                      `}>
                        <div className={`
                          rounded-lg flex items-center justify-center
                          ${viewMode === 'grid' 
                            ? `bg-white dark:bg-gray-800 shadow-lg p-2` 
                            : `bg-white/90 dark:bg-gray-800/90 p-2`
                          }
                        `}>
                          <IconPicker
                            selectedIcon={app.mainAppIcon}
                            onIconSelect={() => {}} // Read-only in this context
                            className={`${viewMode === 'list' ? 'w-5 h-5' : 'w-6 h-6'}`}
                            defaultIcon={app.mainAppIcon}
                            primaryColor={app.primaryColor}
                            accentColor={app.accentColor}
                            iconType="appIcon"
                          />
                        </div>
                        <div>
                          <h3 className={`
                            font-medium truncate max-w-[200px]
                            ${colorClasses.titleClass}
                            ${viewMode === 'list' ? 'text-sm' : 'text-base'}
                          `}>
                            {app.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {app.slug}
                          </p>
                        </div>
                      </div>
                      
                      {viewMode === 'grid' && (
                        <div className={`
                          h-14 overflow-hidden text-sm mb-3 line-clamp-2
                          ${colorClasses.descriptionClass}
                        `}>
                          {app.description || 'No description provided'}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {app.layoutType && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            {app.layoutType}
                          </Badge>
                        )}
                        {app.accentColor && (
                          <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800">
                            <span 
                              className={`inline-block w-2 h-2 rounded-full mr-1 bg-${app.accentColor}-500`}
                            ></span>
                            {app.accentColor}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className={`
                      border-t border-gray-200 dark:border-gray-700 p-3
                      ${colorClasses.cardFooterBg}
                      ${viewMode === 'list' ? 'w-24 border-l border-l-gray-200 dark:border-l-gray-700 flex items-center justify-center' : ''}
                    `}>
                      <Button
                        className={`w-full ${COLOR_VARIANTS.buttonBg[app.accentColor || 'blue']}`}
                        size="sm"
                        onClick={() => onSelectApp(app)}
                      >
                        Select
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      
      {/* Status footer */}
      {!isLoading && filteredApps.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>
            Showing {filteredApps.length} of {apps.length} apps
            {searchTerm && ` for "${searchTerm}"`}
          </span>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SmartAppList.displayName = 'SmartAppList';

export default SmartAppList;