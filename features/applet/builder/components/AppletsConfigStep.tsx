"use client";

import React, { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RootState } from "@/lib/redux/store";
import { startNewApplet, cancelNewApplet, setActiveApplet } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { 
    fetchAppletsThunk, 
    saveAppletThunk, 
    addAppletToAppThunk,
    setActiveAppletWithFetchThunk 
} from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { fetchAppletsForAppThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import {
    selectNewAppletId,
    selectActiveAppletId,
    selectAppletById,
    selectAppletLoading,
    selectAllApplets,
    selectAppletsByAppId,
    selectLocalApplets,
    selectAppletError,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import AppletFormComponent, { DEFAULT_APPLET_CONFIG } from "@/features/applet/builder/components/smart-parts/applets/AppletFormComponent";
import AppletSelectorOverlay from "@/features/applet/builder/components/smart-parts/applets/AppletSelectorOverlay";
import SmartAppletListWrapper from "@/features/applet/builder/components/smart-parts/applets/SmartAppletListWrapper";
import { CustomAppletConfig } from "@/features/applet/builder/builder.types";

interface AppletsConfigStepProps {
    appId?: string; // Optional appId to filter applets
}

export const AppletsConfigStep: React.FC<AppletsConfigStepProps> = ({ appId }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Redux selectors
    const newAppletId = useAppSelector(selectNewAppletId);
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const appletLoading = useAppSelector(selectAppletLoading);
    const appletError = useAppSelector(selectAppletError);
    const applets = useAppSelector((state: RootState) => selectAppletsByAppId(state, appId || ""));
    const availableApplets = useAppSelector(selectAllApplets);
    const localApplets = useAppSelector(selectLocalApplets);

    // This is needed for conditional rendering
    const activeApplet = useAppSelector((state: RootState) => (activeAppletId ? selectAppletById(state, activeAppletId) : null));

    // Initial data loading
    useEffect(() => {
        // Initialize a new applet if no active/new applet exists
        if (!activeAppletId && !newAppletId) {
            dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
        }

        // Load appropriate applets based on context
        if (appId) {
            dispatch(fetchAppletsForAppThunk(appId));
        } else {
            dispatch(fetchAppletsThunk());
        }
    }, [dispatch, appId, activeAppletId, newAppletId]);

    // Show error toasts when they occur
    useEffect(() => {
        if (appletError) {
            toast({
                title: "Error",
                description: appletError,
                variant: "destructive",
            });
        }
    }, [appletError, toast]);

    // Filter available applets that aren't already in the app
    const appletIds = applets.map((applet) => applet.id);
    const filteredAvailableApplets = availableApplets.filter((availableApplet) => !appletIds.includes(availableApplet.id));

    // Handlers
    const handleCreateNewApplet = () => {
        // Always cancel any existing new applet first
        if (newAppletId) {
            dispatch(cancelNewApplet(newAppletId));
        }
        
        // Clear any active applet
        dispatch(setActiveApplet(null));
        
        // Start fresh with new applet
        dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
    };

    const handleSaveApplet = () => {
        if (activeAppletId) {
            dispatch(saveAppletThunk(activeAppletId))
                .unwrap()
                .then((savedApplet) => {
                    toast({
                        title: "Success",
                        description: `Applet "${savedApplet.name}" saved successfully.`,
                    });
                    
                    // If this applet should be associated with an app, make sure it is
                    if (appId && (!savedApplet.appId || savedApplet.appId !== appId)) {
                        dispatch(addAppletToAppThunk({ appletId: savedApplet.id, appId }));
                    }
                    
                    // Refresh the applet list
                    if (appId) {
                        dispatch(fetchAppletsForAppThunk(appId));
                    } else {
                        dispatch(fetchAppletsThunk());
                    }
                })
                .catch((error) => {
                toast({
                    title: "Error",
                        description: typeof error === 'string' ? error : "Failed to save applet.",
                    variant: "destructive",
                });
            });
        }
    };

    const handleAppletSelect = (applet: CustomAppletConfig) => {
        if (appId && applet.id) {
            // Associate selected applet with current app
            dispatch(addAppletToAppThunk({ appletId: applet.id, appId }))
                .unwrap()
                .then(() => {
                    // Set selected applet as active
                    dispatch(setActiveAppletWithFetchThunk(applet.id));
                    
                    // Refresh applet list
                    dispatch(fetchAppletsForAppThunk(appId));
                    
                    toast({
                        title: "Success",
                        description: `Added "${applet.name}" to this app.`,
                    });
                })
                .catch((error) => {
                    toast({
                        title: "Error",
                        description: "Failed to add the applet to this app.",
                        variant: "destructive",
                    });
                });
        } else if (applet.id) {
            // Just set as active if no app context
            dispatch(setActiveAppletWithFetchThunk(applet.id));
        }
    };

    const handleAppletRefreshComplete = () => {
        // Refresh applets for the current context
        if (appId) {
            dispatch(fetchAppletsForAppThunk(appId));
        } else {
            dispatch(fetchAppletsThunk());
        }
    };

    // Determine if we're in edit or create mode
    const isEditMode = activeApplet && !activeApplet.isLocal;
    const isCreateMode = (activeApplet && activeApplet.isLocal) || Boolean(newAppletId);
    
    // Determine if save button should be enabled
    const isDirty = activeApplet?.isDirty;
    const saveButtonDisabled = appletLoading || !isDirty;

    return (
        <div className="w-full">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-6">
                {/* Header Section */}
                <div className="bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-rose-500 font-medium text-lg">Applets Configuration</h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                Applets give you 'buckets' where you can add Recipes, Agents, and Workflows.
                            </p>
                        </div>
                        {/* Metrics Badge */}
                        <div className="flex flex-1 items-end justify-end space-x-3">
                            <Badge
                                variant="outline"
                                className="text-base py-1 px-2.5 text-rose-700 dark:text-rose-400 border-2 border-rose-300 dark:border-rose-700 bg-white dark:bg-rose-900/10"
                            >
                                {applets.length} {applets.length === 1 ? "Applet Added" : "Applets Added"}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="text-base py-1 px-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700"
                            >
                                {filteredAvailableApplets.length} Available to Add
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col md:flex-row">
                    {/* Left side: Form or Edit area */}
                    <div className="w-full md:w-2/3 p-5">
                            <div className="space-y-5">
                                <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    {/* Indicate current mode */}
                                    {isEditMode && (
                                        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                                            Editing Existing Applet
                                        </Badge>
                                    )}
                                    {isCreateMode && (
                                        <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                                            Creating New Applet
                                        </Badge>
                                    )}
                                    
                                    {/* Show dirty state if applicable */}
                                    {isDirty && (
                                        <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                                            Unsaved Changes
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex space-x-2">
                                    <Button 
                                        variant="default"
                                        onClick={handleSaveApplet}
                                        disabled={saveButtonDisabled}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {appletLoading ? "Saving..." : "Save Applet"}
                                    </Button>
                                    
                                    <AppletSelectorOverlay
                                        buttonLabel="Add Existing"
                                        buttonVariant="outline"
                                        buttonSize="sm"
                                        buttonClassName="border-emerald-500 text-emerald-500"
                                        onAppletSelected={handleAppletSelect}
                                        onCreateApplet={handleCreateNewApplet}
                                        onRefreshComplete={handleAppletRefreshComplete}
                                        dialogTitle="Select an Applet to Add"
                                    />
                                </div>
                            </div>

                            {/* Always show the form, just change what's loaded in it */}
                            <AppletFormComponent 
                                appletId={activeAppletId || newAppletId} 
                                appId={appId} 
                                isNew={activeApplet?.isLocal ?? true}
                            />
                        </div>
                    </div>

                    {/* Right side: Applet list */}
                    <div className="w-full md:w-1/3 p-5 bg-gray-50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-900 dark:text-gray-100 font-medium">
                                Your Applets <span className="text-sm text-gray-500 dark:text-gray-400">({applets.length})</span>
                            </h3>

                            {/* Action buttons */}
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-500 text-emerald-500"
                                    onClick={handleCreateNewApplet}
                                >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    New
                                </Button>

                                <AppletSelectorOverlay
                                    buttonLabel="Add Existing"
                                    buttonVariant="outline"
                                    buttonSize="sm"
                                    buttonClassName="border-emerald-500 text-emerald-500"
                                    onAppletSelected={handleAppletSelect}
                                    onCreateApplet={handleCreateNewApplet}
                                    onRefreshComplete={handleAppletRefreshComplete}
                                />
                            </div>
                        </div>

                        {/* Applet list */}
                        <div className="mt-4">
                            {applets.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">No applets added yet</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create new or add existing applets</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                    <SmartAppletListWrapper
                                        appId={appId}
                                        onSelectApplet={(applet) => dispatch(setActiveAppletWithFetchThunk(applet.id))}
                                        showCreateButton={false}
                                        onRefreshComplete={handleAppletRefreshComplete}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AppletsConfigStep;
