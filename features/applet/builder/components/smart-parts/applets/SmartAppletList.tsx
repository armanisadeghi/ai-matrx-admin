'use client';
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, Filter, Grid, List, ArrowUpDown, RefreshCw, BoxIcon } from 'lucide-react';
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
import { getAllCustomAppletConfigs, getCustomAppletConfigById } from '@/features/applet/builder/service/customAppletService';
import { COLOR_VARIANTS, ICON_OPTIONS } from '@/features/applet/layouts/helpers/StyledComponents';
import { CustomAppletConfig } from '@/features/applet/builder/builder.types';

// Define type for appletIds
type AppletId = string;

// Define and export the SmartAppletListRefType
export type SmartAppletListRefType = {
  refresh: (specificAppletIds?: AppletId[]) => Promise<CustomAppletConfig[]>;
};

/**
 * A modern, standalone SmartAppletList component that fetches and displays applets
 * @param {Object} props
 * @param {Function} props.onSelectApplet - Callback when applet is selected
 * @param {boolean} props.showCreateButton - Whether to show the create button
 * @param {Function} props.onCreateApplet - Callback when create button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {string[]} props.appletIds - Optional list of applet IDs to fetch and display
 * @param {Function} props.onRefreshComplete - Optional callback when refresh completes
 */
const SmartAppletList = forwardRef<SmartAppletListRefType, {
  onSelectApplet: any,
  showCreateButton?: boolean,
  onCreateApplet: any,
  className?: string,
  appletIds?: any,
  onRefreshComplete?: any
}>(({ 
  onSelectApplet, 
  showCreateButton = true, 
  onCreateApplet,
  className = '',
  appletIds,
  onRefreshComplete
}, ref) => {
  const { toast } = useToast();
  const [applets, setApplets] = useState<CustomAppletConfig[]>([]);
  const [filteredApplets, setFilteredApplets] = useState<CustomAppletConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref to store appletIds for comparison
  const prevAppletIdsRef = useRef<AppletId[] | undefined>(undefined);

  // Function to load all applets
  const loadAllApplets = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const fetchedApplets = await getAllCustomAppletConfigs();
      setApplets(fetchedApplets);
      setFilteredApplets(applyFiltersAndSort(fetchedApplets, searchTerm, sortBy));
      return fetchedApplets;
    } catch (error) {
      console.error('Failed to load applets:', error);
      toast({
        title: "Error",
        description: "Failed to load applets",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Function to load specific applets by ID
  const loadAppletsByIds = useCallback(async (ids: AppletId[] | undefined, showLoading = true) => {
    if (!ids || ids.length === 0) return [];
    
    if (showLoading) setIsLoading(true);
    try {
      const appletPromises = ids.map(id => getCustomAppletConfigById(id));
      const fetchedApplets = await Promise.all(appletPromises);
      // Filter out any null results (failed fetches)
      const validApplets = fetchedApplets.filter(applet => applet);
      
      setApplets(validApplets);
      setFilteredApplets(applyFiltersAndSort(validApplets, searchTerm, sortBy));
      return validApplets;
    } catch (error) {
      console.error('Failed to load specific applets:', error);
      toast({
        title: "Error",
        description: "Failed to load applets",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Helper function to apply filters and sorting
  const applyFiltersAndSort = (appletList: CustomAppletConfig[], term: string, sort: string) => {
    // First apply search term filter
    let result = appletList;
    
    if (term.trim()) {
      const lowercaseTerm = term.toLowerCase();
      result = appletList.filter(applet => 
        applet.name?.toLowerCase().includes(lowercaseTerm) || 
        applet.description?.toLowerCase().includes(lowercaseTerm) ||
        applet.creator?.toLowerCase().includes(lowercaseTerm) ||
        applet.slug?.toLowerCase().includes(lowercaseTerm)
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
        // Sort by ID as fallback since createdAt might not exist
        result.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
        break;
      case 'date-desc':
        result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        break;
      default:
        break;
    }
    
    return result;
  };
  
  // Initial load
  useEffect(() => {
    if (appletIds && appletIds.length > 0) {
      loadAppletsByIds(appletIds);
      prevAppletIdsRef.current = [...appletIds];
    } else {
      loadAllApplets();
    }
  }, [loadAllApplets, loadAppletsByIds, appletIds]);
  
  // Watch for changes in appletIds prop
  useEffect(() => {
    const prevAppletIds = prevAppletIdsRef.current;
    
    // Check if appletIds has changed
    const hasChanged = () => {
      if (!prevAppletIds && appletIds) return true;
      if (prevAppletIds && !appletIds) return true;
      if (!prevAppletIds && !appletIds) return false;
      if (prevAppletIds.length !== appletIds?.length) return true;
      
      // Check if any ids are different - only run if appletIds exists
      return appletIds?.some(id => !prevAppletIds.includes(id)) || false;
    };
    
    if (hasChanged()) {
      if (appletIds && appletIds.length > 0) {
        loadAppletsByIds(appletIds);
      } else {
        loadAllApplets();
      }
      
      prevAppletIdsRef.current = appletIds ? [...appletIds] : undefined;
    }
  }, [appletIds, loadAllApplets, loadAppletsByIds]);

  // Handle search term changes
  useEffect(() => {
    setFilteredApplets(applyFiltersAndSort(applets, searchTerm, sortBy));
  }, [searchTerm, applets, sortBy]);

  // Handle sort changes
  useEffect(() => {
    setFilteredApplets(applyFiltersAndSort(applets, searchTerm, sortBy));
  }, [sortBy, applets, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  // Public refresh method for specific applets
  const refreshApplets = async (specificAppletIds?: AppletId[]) => {
    setIsRefreshing(true);
    try {
      let refreshedApplets;
      
      if (specificAppletIds && specificAppletIds.length > 0) {
        refreshedApplets = await loadAppletsByIds(specificAppletIds, false);
      } else if (appletIds && appletIds.length > 0) {
        refreshedApplets = await loadAppletsByIds(appletIds, false);
      } else {
        refreshedApplets = await loadAllApplets(false);
      }
      
      if (onRefreshComplete) {
        onRefreshComplete(refreshedApplets);
      }
      
      return refreshedApplets;
    } catch (error) {
      console.error('Error refreshing applets:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh applet data",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };

  // Expose the refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshApplets
  }), [refreshApplets]);

  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refreshApplets();
    toast({
      title: "Refreshing",
      description: "Updating applet list...",
    });
  };

  // Helper function to render the appropriate icon
  const renderIcon = (iconName: string | undefined) => {
    if (!iconName) return <BoxIcon className="h-5 w-5" />;
    
    const IconComponent = ICON_OPTIONS[iconName];
    if (!IconComponent) return <BoxIcon className="h-5 w-5" />;
    
    return <IconComponent className="h-5 w-5" />;
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

  // Get color classes based on applet's primary color
  const getColorClasses = (applet: CustomAppletConfig) => {
    const color = applet.primaryColor || 'emerald';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-white dark:bg-gray-800';
    const defaultCardFooterBg = 'bg-gray-50 dark:bg-gray-800';
    const defaultDescriptionClass = 'text-gray-600 dark:text-gray-300';
    
    // If we're using banner images, don't colorize
    if (viewMode === 'grid' && applet.imageUrl) {
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
            placeholder="Search applets..."
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
              className={`rounded-none px-2 ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {showCreateButton && (
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              size="sm"
              onClick={onCreateApplet}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>
      </div>
      
      {/* Applet cards */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' 
          : 'space-y-3'
      }>
        {isLoading ? (
          renderSkeletons()
        ) : filteredApplets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No applets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm ? "Try a different search term" : "Create your first applet to get started"}
            </p>
            {showCreateButton && (
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white mt-4"
                onClick={onCreateApplet}
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Applet
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredApplets.map(applet => {
              const colorClasses = getColorClasses(applet);
              
              return (
                <motion.div
                  key={applet.id}
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
                        {applet.imageUrl ? (
                          <>
                            <img 
                              src={applet.imageUrl} 
                              alt={applet.name} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </>
                        ) : (
                          // Image placeholder with primaryColor background
                          <div className={`w-full h-full flex items-center justify-center
                            ${applet.primaryColor ? `bg-${applet.primaryColor}-300 dark:bg-${applet.primaryColor}-800` : 'bg-emerald-300 dark:bg-emerald-800'}
                          `}>
                            <div className="opacity-20">
                              {renderIcon(applet.appletIcon)}
                            </div>
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
                          {renderIcon(applet.appletIcon)}
                        </div>
                        <div>
                          <h3 className={`
                            font-medium truncate max-w-[200px]
                            ${colorClasses.titleClass}
                            ${viewMode === 'list' ? 'text-sm' : 'text-base'}
                          `}>
                            {applet.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {applet.slug}
                          </p>
                        </div>
                      </div>
                      
                      {viewMode === 'grid' && (
                        <div className={`
                          h-14 overflow-hidden text-sm mb-3 line-clamp-2
                          ${colorClasses.descriptionClass}
                        `}>
                          {applet.description || 'No description provided'}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {applet.layoutType && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                            {applet.layoutType}
                          </Badge>
                        )}
                        {applet.compiledRecipeId && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Recipe
                          </Badge>
                        )}
                        {applet.containers && applet.containers.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                            {applet.containers.length} Container{applet.containers.length !== 1 ? 's' : ''}
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
                        className={`w-full ${COLOR_VARIANTS.buttonBg[applet.accentColor || 'emerald']}`}
                        size="sm"
                        onClick={() => onSelectApplet(applet)}
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
      {!isLoading && filteredApplets.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>
            Showing {filteredApplets.length} of {applets.length} applets
            {searchTerm && ` for "${searchTerm}"`}
          </span>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SmartAppletList.displayName = 'SmartAppletList';

export default SmartAppletList;