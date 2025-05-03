"use client";

import React, { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RootState } from "@/lib/redux/store";
import { startNewApplet, cancelNewApplet, setActiveApplet } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { createAppletThunk, fetchAppletsThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { fetchAppletsForAppThunk, addAppletThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import {
    selectNewAppletId,
    selectActiveAppletId,
    selectAppletById,
    selectAppletLoading,
    selectAllApplets,
    selectAppletsByAppId,
    selectLocalApplets,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useToast } from "@/components/ui/use-toast";
import AppletCarousel from "@/features/applet/builder/previews/AppletCarousel";
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
    const applets = useAppSelector((state: RootState) => selectAppletsByAppId(state, appId || ""));
    const availableApplets = useAppSelector(selectAllApplets);
    const localApplets = useAppSelector(selectLocalApplets);
    const showExistingApplets = localApplets.length === 0; // Show existing applets if no local applet is being created

    // This is needed for conditional rendering
    const activeApplet = useAppSelector((state: RootState) => (activeAppletId ? selectAppletById(state, activeAppletId) : null));

    // Initialize a new applet on mount if none exists and fetch applets for the app
    useEffect(() => {
        if (!newAppletId && localApplets.length === 0) {
            dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
        }

        // Fetch applets for this app if appId is provided
        if (appId) {
            dispatch(fetchAppletsForAppThunk(appId));
        } else {
            // Fetch all applets if no appId is provided
            dispatch(fetchAppletsThunk());
        }
    }, [dispatch, newAppletId, localApplets, appId]);

    // Filter available applets that aren't already in the app
    const appletIds = applets.map((applet) => applet.id);
    const filteredAvailableApplets = availableApplets.filter((availableApplet) => !appletIds.includes(availableApplet.id));

    const handleSelectExistingApplet = (appletId: string) => {
        const selectedApplet = availableApplets.find((a) => a.id === appletId);
        if (selectedApplet) {
            const appletToAdd = {
                ...selectedApplet,
                containers: selectedApplet.containers || [],
                appId: appId || undefined,
            };
            dispatch(createAppletThunk(appletToAdd)).catch((error) => {
                toast({
                    title: "Error",
                    description: "Failed to add existing applet.",
                    variant: "destructive",
                });
            });
        }
    };

    const handleAppletAdded = (appletId: string) => {
        // Clear current local applet and start a new one
        dispatch(cancelNewApplet(newAppletId!));
        dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
    };

    const handleAppletRemoved = () => {
        // Deselect the active applet
        dispatch(setActiveApplet(null));
    };

    // Handler for AppletSelectorOverlay
    const handleAppletSelect = (applet: CustomAppletConfig) => {
        if (appId && applet.id) {
            // Associate the selected applet with the current app
            dispatch(addAppletThunk({ appId, appletId: applet.id }))
                .unwrap()
                .then(() => {
                    // Refresh the applets after successful association
                    dispatch(fetchAppletsForAppThunk(appId));
                    // Set the selected applet as active so they can edit it
                    dispatch(setActiveApplet(applet.id));
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
        }
    };

    const handleCreateApplet = () => {
        // Deselect any active applet to show the form
        dispatch(setActiveApplet(null));
        
        // Cancel any existing new applet first
        if (newAppletId) {
            dispatch(cancelNewApplet(newAppletId));
        }
        
        // Then create a new one
        dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
    };

    const handleAppletRefreshComplete = () => {
        // Refresh applets for the current app
        if (appId) {
            dispatch(fetchAppletsForAppThunk(appId));
        }
    };

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
                        {activeApplet ? (
                            /* Edit existing applet */
                            <AppletFormComponent
                                appletId={activeAppletId}
                                appId={appId}
                                onAppletRemoved={handleAppletRemoved}
                                isNew={false}
                            />
                        ) : (
                            /* Create new applet form or select existing */
                            <div className="space-y-5">
                                <div className="flex justify-between items-center">
                                    <AppletSelectorOverlay
                                        buttonLabel="Add Existing"
                                        buttonVariant="outline"
                                        buttonSize="sm"
                                        buttonClassName="border-emerald-500 text-emerald-500"
                                        onAppletSelected={handleAppletSelect}
                                        onCreateApplet={handleCreateApplet}
                                        onRefreshComplete={handleAppletRefreshComplete}
                                        dialogTitle="Select an Applet to Add"
                                    />
                                </div>

                                {/* Always show the form for creating a new applet */}
                                <AppletFormComponent appletId={newAppletId} appId={appId} onAppletAdded={handleAppletAdded} isNew={true} />
                            </div>
                        )}
                    </div>

                    {/* Right side: Applet list */}
                    <div className="w-full md:w-1/3 p-5 bg-gray-50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-900 dark:text-gray-100 font-medium">
                                Your Applets <span className="text-sm text-gray-500 dark:text-gray-400">({applets.length})</span>
                            </h3>

                            {/* Always show both buttons */}
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-500 text-emerald-500"
                                    onClick={() => {
                                        // Deselect the active applet to show the form
                                        dispatch(setActiveApplet(null));
                                        
                                        // Cancel any existing new applet first
                                        if (newAppletId) {
                                            dispatch(cancelNewApplet(newAppletId));
                                        }
                                        
                                        // Then create a new one
                                        dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
                                    }}
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
                                    onCreateApplet={handleCreateApplet}
                                    onRefreshComplete={handleAppletRefreshComplete}
                                />
                            </div>
                        </div>

                        {/* Always show the list, with appropriate empty state */}
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
                                        onSelectApplet={(applet) => dispatch(setActiveApplet(applet.id))}
                                        showCreateButton={false}
                                        onRefreshComplete={() => {
                                            if (appId) {
                                                dispatch(fetchAppletsForAppThunk(appId));
                                            }
                                        }}
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
