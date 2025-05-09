"use client";
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { Search, Plus, Filter, Grid, List, ArrowUpDown, RefreshCw, BoxIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux";
import { fetchAppletsThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import {
    selectAllApplets,
    selectAppletLoading,
    selectAppletError,
    selectAppletsByIds,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { COLOR_VARIANTS, ICON_OPTIONS } from "@/features/applet/layouts/helpers/StyledComponents";
import { CustomAppletConfig } from "@/features/applet/builder/builder.types";
import { getAppletColorClasses } from "@/features/applet/builder/styles";


export type SmartAppletListRefType = {
    refresh: (specificAppletIds?: string[]) => Promise<CustomAppletConfig[]>;
};

/**
 * A modern, standalone SmartAppletList component that fetches and displays applets
 * @param {Object} props
 * @param {Function} props.onSelectApplet - Callback when applet is selected
 * @param {Function} props.onEditApplet - Callback when applet is edited
 * @param {boolean} props.showCreateButton - Whether to show the create button
 * @param {Function} props.onCreateApplet - Callback when create button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {string[]} props.appletIds - Optional list of applet IDs to fetch and display
 * @param {Function} props.onRefreshComplete - Optional callback when refresh completes
 * @param {string} props.appId - Optional appId to filter applets by
 */
const SmartAppletList = forwardRef<
    SmartAppletListRefType,
    {
        onSelectApplet?: (applet: CustomAppletConfig) => void;
        onEditApplet?: (applet: CustomAppletConfig) => void;
        showCreateButton?: boolean;
        onCreateApplet?: () => void;
        className?: string;
        appletIds?: string[];
        onRefreshComplete?: (applets: CustomAppletConfig[]) => void;
        appId?: string; // Add appId prop
        initialViewMode?: "grid" | "list";
        shouldFetch?: boolean;
    }
>(
    (
        {
            onSelectApplet,
            onEditApplet,
            showCreateButton = true,
            onCreateApplet,
            className = "",
            appletIds,
            onRefreshComplete,
            appId, // New prop
            initialViewMode = "grid",
            shouldFetch = true,
        },
        ref
    ) => {
        const { toast } = useToast();
        const dispatch = useAppDispatch();
        const store = useAppStore();

        // Local UI state
        const [searchTerm, setSearchTerm] = useState("");
        const [viewMode, setViewMode] = useState(initialViewMode); // 'grid' or 'list'
        const [sortBy, setSortBy] = useState("name-asc"); // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
        const [isRefreshing, setIsRefreshing] = useState(false);

        // Redux state
        const allApplets = useAppSelector(selectAllApplets);
        const isLoading = useAppSelector(selectAppletLoading);
        const error = useAppSelector(selectAppletError);

        // Derived state
        const baseApplets = appletIds ? useAppSelector((state) => selectAppletsByIds(state, appletIds)) : allApplets;

        // Filter by appId if provided
        const applets = React.useMemo(() => {
            if (!appId) return baseApplets;
            return baseApplets.filter((applet) => applet.appId === appId);
        }, [baseApplets, appId]);

        // Apply filters and sorting to applets from Redux
        const filteredApplets = React.useMemo(() => {
            let result = [...applets];

            // Apply search filter
            if (searchTerm.trim()) {
                const lowercaseTerm = searchTerm.toLowerCase();
                result = result.filter(
                    (applet) =>
                        applet.name?.toLowerCase().includes(lowercaseTerm) ||
                        applet.description?.toLowerCase().includes(lowercaseTerm) ||
                        applet.creator?.toLowerCase().includes(lowercaseTerm) ||
                        applet.slug?.toLowerCase().includes(lowercaseTerm)
                );
            }

            // Apply sorting
            switch (sortBy) {
                case "name-asc":
                    result.sort((a, b) => a.name?.localeCompare(b.name));
                    break;
                case "name-desc":
                    result.sort((a, b) => b.name?.localeCompare(a.name));
                    break;
                case "date-asc":
                    // Sort by ID as fallback since createdAt might not exist
                    result.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
                    break;
                case "date-desc":
                    result.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
                    break;
                default:
                    break;
            }

            return result;
        }, [applets, searchTerm, sortBy]);
        // Initial data fetch
        useEffect(() => {
            if (shouldFetch) {
                // Only fetch if we have no applets or we're showing all applets (no specific IDs)
                if (allApplets.length === 0 || !appletIds) {
                    dispatch(fetchAppletsThunk());
                }
            }
        }, [dispatch, allApplets.length, appletIds, shouldFetch]);
        // Create a refresh function using useRef to always access the latest implementation
        const refreshRef = useRef<(specificAppletIds?: string[]) => Promise<CustomAppletConfig[]>>(null!);
        // Expose the refresh method via ref
        useImperativeHandle(
            ref,
            () => {
                // Create the function once
                const refreshFn = async (specificAppletIds?: string[]) => {
                    setIsRefreshing(true);
                    try {
                        // Use specificAppletIds if provided, otherwise use the component's appletIds
                        const appletsToRefresh = specificAppletIds || appletIds;
                        await dispatch(fetchAppletsThunk()).unwrap();

                        // Get the current state immediately after the fetch
                        const state = store.getState();
                        const currentAllApplets = selectAllApplets(state);
                        let currentApplets = appletsToRefresh ? selectAppletsByIds(state, appletsToRefresh) : currentAllApplets;

                        // Apply appId filter if provided
                        if (appId) {
                            currentApplets = currentApplets.filter((applet) => applet.appId === appId);
                        }

                        // Call the callback if provided
                        if (onRefreshComplete) {
                            onRefreshComplete(currentApplets);
                        }

                        return currentApplets;
                    } catch (error) {
                        console.error("Error refreshing applets:", error);
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

                // Store the function in our ref for internal use
                refreshRef.current = refreshFn;

                // Return the interface
                return {
                    refresh: refreshFn,
                };
            },
            [dispatch, toast, appletIds, onRefreshComplete, store, appId]
        );
        // Handle manual refresh button click
        const handleRefreshClick = () => {
            refreshRef.current();
            toast({
                title: "Refreshing",
                description: "Updating applet list...",
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
        // Helper function to render the appropriate icon
        const renderIcon = (iconName: string | undefined) => {
            if (!iconName) return <BoxIcon className="h-5 w-5" />;

            const IconComponent = ICON_OPTIONS[iconName];
            if (!IconComponent) return <BoxIcon className="h-5 w-5" />;

            return <IconComponent className="h-5 w-5" />;
        };
        // Renders skeleton cards during loading state
        const renderSkeletons = () => {
            return Array(6)
                .fill(0)
                .map((_, index) => (
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

        // Show error state if Redux has an error
        if (error) {
            return (
                <div className="p-6 text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg inline-block mb-4">
                        <BoxIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Applets</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{error}</p>
                    <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white" onClick={handleRefreshClick}>
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
                            className="pl-10 pr-4 py-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            placeholder="Search applets..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm" 
                            onClick={handleRefreshClick}
                            disabled={isLoading || isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? "animate-spin" : ""}`} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <ArrowUpDown className="h-4 w-4" />
                                    <span className="hidden sm:inline">Sort</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSortChange("name-asc")}>Name (A-Z)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSortChange("name-desc")}>Name (Z-A)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSortChange("date-desc")}>Newest First</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSortChange("date-asc")}>Oldest First</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                className={`rounded-none px-2 ${viewMode === "grid" ? "bg-emerald-500 text-white" : "text-gray-500"}`}
                                onClick={() => setViewMode("grid")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                className={`rounded-none px-2 ${viewMode === "list" ? "bg-emerald-500 text-white" : "text-gray-500"}`}
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        {showCreateButton && onCreateApplet && (
                            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm" onClick={onCreateApplet}>
                                <Plus className="h-4 w-4 mr-1" /> New
                            </Button>
                        )}
                    </div>
                </div>

                {/* Applet cards */}
                <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3"}>
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
                            {showCreateButton && onCreateApplet && (
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white mt-4" onClick={onCreateApplet}>
                                    <Plus className="h-4 w-4 mr-2" /> Create New Applet
                                </Button>
                            )}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredApplets.map((applet) => {
                                const colorClasses = getAppletColorClasses(applet, viewMode);

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
                      ${viewMode === "list" ? "flex overflow-hidden" : "overflow-hidden"}
                      ${colorClasses.cardBg}
                    `}
                                        >
                                            {/* Banner image - only show in grid view */}
                                            {viewMode === "grid" && (
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
                                                        <div
                                                            className={`w-full h-full flex items-center justify-center
                            ${
                                applet.primaryColor
                                    ? `bg-${applet.primaryColor}-300 dark:bg-${applet.primaryColor}-800`
                                    : "bg-emerald-300 dark:bg-emerald-800"
                            }
                          `}
                                                        >
                                                            <div className="opacity-20">{renderIcon(applet.appletIcon)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <CardContent
                                                className={`
                      ${viewMode === "list" ? "flex-1 p-4" : "p-4 pt-4"}
                      ${viewMode === "grid" ? "-mt-8 relative" : ""}
                    `}
                                            >
                                                <div
                                                    className={`
                        flex items-center gap-3
                        ${viewMode === "list" ? "mb-1" : "mb-3"}
                      `}
                                                >
                                                    <div
                                                        className={`
                          rounded-lg flex items-center justify-center
                          ${viewMode === "grid" ? `bg-white dark:bg-gray-800 shadow-lg p-2` : `bg-white/90 dark:bg-gray-800/90 p-2`}
                        `}
                                                    >
                                                        {renderIcon(applet.appletIcon)}
                                                    </div>
                                                    <div>
                                                        <h3
                                                            className={`
                            font-medium truncate max-w-[200px]
                            ${colorClasses.titleClass}
                            ${viewMode === "list" ? "text-sm" : "text-base"}
                          `}
                                                        >
                                                            {applet.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                                            {applet.slug}
                                                        </p>
                                                    </div>
                                                </div>

                                                {viewMode === "grid" && (
                                                    <div
                                                        className={`
                          h-14 overflow-hidden text-sm mb-3 line-clamp-2
                          ${colorClasses.descriptionClass}
                        `}
                                                    >
                                                        {applet.description || "No description provided"}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {applet.layoutType && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                                        >
                                                            {applet.layoutType}
                                                        </Badge>
                                                    )}
                                                    {applet.compiledRecipeId && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                        >
                                                            Recipe
                                                        </Badge>
                                                    )}
                                                    {applet.containers && applet.containers.length > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                                        >
                                                            {applet.containers.length} Container{applet.containers.length !== 1 ? "s" : ""}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>

                                            <CardFooter
                                                className={`
                      border-t border-gray-200 dark:border-gray-700 p-3
                      ${colorClasses.cardFooterBg}
                      ${
                          viewMode === "list"
                              ? "w-24 border-l border-l-gray-200 dark:border-l-gray-700 flex items-center justify-center"
                              : ""
                      }
                    `}
                                            >
                                                <div className={`flex w-full gap-2 ${viewMode === "list" ? "flex-col" : ""}`}>
                                                    {onSelectApplet && (
                                                        <Button
                                                            className={`flex-1 ${COLOR_VARIANTS.buttonBg[applet.accentColor || "emerald"]}`}
                                                            size="sm"
                                                            onClick={() => onSelectApplet(applet)}
                                                        >
                                                            Select
                                                        </Button>
                                                    )}
                                                    {onEditApplet && (
                                                        <Button
                                                            className={`flex-1 bg-transparent border border-current hover:bg-opacity-10 font-bold ${COLOR_VARIANTS.text[applet.accentColor || "emerald"]}`}
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onEditApplet(applet)}
                                                        >
                                                            Edit
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
    }
);

// Add display name for debugging
SmartAppletList.displayName = "SmartAppletList";

export default SmartAppletList;
