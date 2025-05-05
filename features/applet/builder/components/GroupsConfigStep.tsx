"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, Loader2, SaveIcon, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
    selectAppletsByAppId,
    selectActiveAppletId,
    selectAppletById,
    selectContainersForApplet,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import {
    selectActiveContainerId,
    selectContainerError,
    selectNewContainerId,
    selectAllContainerIds,
    selectContainerById,
} from "@/lib/redux/app-builder/selectors/containerSelectors";
import { setIsDirty as setAppletIsDirty } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { setActiveContainer, startNewContainer } from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import {
    saveContainerAndUpdateAppletThunk,
    fetchContainerByIdThunk,
    setActiveContainerWithFetchThunk,
} from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { saveAppletThunk, recompileAppletThunk, setActiveAppletWithFetchThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import GroupSelectorOverlay from "./smart-parts/containers/GroupSelectorOverlay";
import ContainerFormComponent from "./smart-parts/containers/ContainerFormComponent";
import { ComponentGroup } from "../builder.types";
import { AppletBuilder, ContainerBuilder } from "@/lib/redux/app-builder/types";
import { v4 as uuidv4 } from "uuid";
import { CgPullClear } from "react-icons/cg";
import AppInfoCard from "@/features/applet/builder/previews/AppInfoCard";

interface GroupsConfigStepProps {
    appId: string;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({ appId }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();

    // Simple UI toggle state - keep as React state
    const [processingContainerId, setProcessingContainerId] = useState<string | null>(null);
    const [isAddingToApplet, setIsAddingToApplet] = useState<boolean>(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
    const [savingApplet, setSavingApplet] = useState<boolean>(false);
    const [fetchingContainer, setFetchingContainer] = useState<boolean>(false);

    // Get data directly from Redux using individual selectors
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const containerError = useAppSelector(selectContainerError);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const newContainerId = useAppSelector(selectNewContainerId);
    const allContainerIds = useAppSelector(selectAllContainerIds);

    // Get applets directly from Redux
    const applets = useAppSelector((state) => (appId ? selectAppletsByAppId(state, appId) : [])) as AppletBuilder[];

    // Get containers for the active applet
    const appletContainers = useAppSelector((state) => (activeAppletId ? selectContainersForApplet(state, activeAppletId) : []));

    // Get the active applet to check if it's dirty
    const activeApplet = useAppSelector((state) => (activeAppletId ? selectAppletById(state, activeAppletId) : null));
    const isAppletDirty = activeApplet?.isDirty || false;
    const activeAppletName = activeApplet?.name || "";

    // Show error toasts when they occur
    useEffect(() => {
        if (containerError) {
            toast({
                title: "Error",
                description: containerError,
                variant: "destructive",
            });
        }
    }, [containerError, toast]);

    // Initialize on component mount - set the first applet as active if there are applets and none is selected
    useEffect(() => {
        if (applets.length > 0 && !initialLoadComplete) {
            dispatch(setActiveAppletWithFetchThunk(applets[0].id));
            setInitialLoadComplete(true);
        }
    }, [applets, dispatch, initialLoadComplete]);

    // Always ensure we have a container to work with
    useEffect(() => {
        // If we have an active applet but no active container, create one
        if (activeAppletId && !activeContainerId && !newContainerId && initialLoadComplete) {
            const newId = uuidv4();
            dispatch(startNewContainer({ id: newId }));
        }
    }, [activeAppletId, activeContainerId, newContainerId, initialLoadComplete, dispatch]);

    // Handle applet tab selection
    const handleAppletChange = (appletId: string) => {
        // If current applet is dirty, save it first
        if (activeAppletId && isAppletDirty) {
            saveActiveApplet();
        }

        if (appletId) {
            dispatch(setActiveAppletWithFetchThunk(appletId));
            // Clear the active container when switching applets
            dispatch(setActiveContainer(null));
        }
    };

    // Create a new container
    const handleCreateNewContainer = useCallback(() => {
        const newId = uuidv4();
        dispatch(startNewContainer({ id: newId }));
    }, [dispatch]);

    // Select a container to edit
    const handleContainerSelect = async (containerId: string) => {
        // Check if the container already exists in state
        const containerExists = allContainerIds.includes(containerId);

        if (containerExists) {
            // Container already in state, just set it as active
            dispatch(setActiveContainerWithFetchThunk(containerId));
        } else {
            // Container not in state, need to fetch it first
            setFetchingContainer(true);
            try {
                await dispatch(fetchContainerByIdThunk(containerId)).unwrap();
                dispatch(setActiveContainerWithFetchThunk(containerId));

                toast({
                    title: "Success",
                    description: "Container loaded successfully.",
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load container from database.",
                    variant: "destructive",
                });
            } finally {
                setFetchingContainer(false);
            }
        }
    };

    // Filter containers that are already in the applet
    const appletContainerIds = appletContainers.map((container: ContainerBuilder) => container.id);

    // Check if the current container is already in the applet
    const isContainerInApplet = activeContainerId ? appletContainerIds.includes(activeContainerId) : false;

    // Handle container save completion
    const handleContainerSaved = (containerId: string) => {
        // If the container is part of an applet, mark the applet as dirty 
        handleAddContainerToApplet();
        
        if (activeAppletId && isContainerInApplet) {
            dispatch(
                setAppletIsDirty({
                    id: activeAppletId,
                    isDirty: true,
                })
            );
        }

        // If this was a new container, create a new one to replace it
        if (containerId === newContainerId) {
            handleCreateNewContainer();
        }
    };

    // Add an existing container to the current applet
    const handleExistingContainerSelect = async (group: ComponentGroup) => {
        if (activeAppletId) {
            setIsAddingToApplet(true);
            setProcessingContainerId(group.id);

            // Check if container exists in state
            const containerExists = allContainerIds.includes(group.id);

            try {
                // Fetch the container if it's not in state
                if (!containerExists) {
                    await dispatch(fetchContainerByIdThunk(group.id)).unwrap();
                }

                // First select the container so the form updates
                dispatch(setActiveContainerWithFetchThunk(group.id));

                // Add the container to the applet using the thunk that handles database updates
                await dispatch(
                    saveContainerAndUpdateAppletThunk({
                        containerId: group.id,
                        appletId: activeAppletId,
                    })
                ).unwrap();

                // After successfully adding the container to the applet in the database,
                // save and recompile the applet to ensure everything is in sync
                await saveAndRecompileApplet(activeAppletId);

                toast({
                    title: "Success",
                    description: "Group added to applet successfully.",
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: typeof error === "string" ? error : "Failed to add group to applet.",
                    variant: "destructive",
                });
            } finally {
                setProcessingContainerId(null);
                setIsAddingToApplet(false);
            }
        }
    };

    // Save active applet and recompile it
    const saveAndRecompileApplet = async (appletId: string) => {
        if (!appletId) return;

        setSavingApplet(true);

        try {
            // First, save the applet to ensure all changes are persisted
            await dispatch(saveAppletThunk(appletId)).unwrap();

            // After saving, recompile the applet to ensure all container relationships are updated
            await dispatch(recompileAppletThunk(appletId)).unwrap();

            toast({
                title: "Success",
                description: "Applet containers recompiled successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: typeof error === "string" ? error : "Failed to recompile applet containers.",
                variant: "destructive",
            });
        } finally {
            setSavingApplet(false);
        }
    };

    // Save the active applet
    const saveActiveApplet = () => {
        if (activeAppletId && isAppletDirty) {
            saveAndRecompileApplet(activeAppletId);
        }
    };

    // Add container to applet (if not already added)
    const handleAddContainerToApplet = async () => {
        if (!activeContainerId || !activeAppletId) return;

        setIsAddingToApplet(true);
        setProcessingContainerId(activeContainerId);

        try {
            // Add the container to the applet and update the database
            await dispatch(
                saveContainerAndUpdateAppletThunk({
                    containerId: activeContainerId,
                    appletId: activeAppletId,
                })
            ).unwrap();

            // After successfully adding the container, save and recompile the applet
            await saveAndRecompileApplet(activeAppletId);

            toast({
                title: "Success",
                description: "Container added to applet and saved successfully.",
            });

            // Create a new container form after successful add
            handleCreateNewContainer();
        } catch (error) {
            toast({
                title: "Error",
                description: typeof error === "string" ? error : "Failed to add container to applet.",
                variant: "destructive",
            });
        } finally {
            setProcessingContainerId(null);
            setIsAddingToApplet(false);
        }
    };

    const currentContainerId = activeContainerId || newContainerId;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Configure Groups for App</h2>

            {applets.length === 0 ? (
                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            No applets have been created yet. Please go back and add applets first.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Tabs value={activeAppletId || ""} onValueChange={handleAppletChange} className="w-full">
                        <TabsList className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                            {applets.map((applet) => (
                                <TabsTrigger
                                    key={applet.id}
                                    value={applet.id}
                                    className={`flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm ${
                                        applet.isDirty
                                            ? 'font-bold before:content-["⬤"] before:mr-1 before:text-amber-500 before:text-xs'
                                            : ""
                                    }`}
                                >
                                    {applet.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {applets.map((applet) => (
                            <TabsContent key={applet.id} value={applet.id} className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Container form card */}
                                    <div className="md:col-span-5">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                                {isContainerInApplet
                                                    ? `Edit Container for ${applet.name}`
                                                    : `Add Container to ${applet.name}`}
                                            </h3>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-emerald-500 text-emerald-500"
                                                    onClick={handleCreateNewContainer}
                                                >
                                                    Create New
                                                </Button>

                                                <GroupSelectorOverlay
                                                    buttonLabel="Select Existing"
                                                    buttonVariant="outline"
                                                    buttonSize="sm"
                                                    buttonClassName="border-blue-500 text-blue-500"
                                                    onGroupSelected={handleExistingContainerSelect}
                                                    onCreateGroup={handleCreateNewContainer}
                                                />
                                            </div>
                                        </div>

                                        {fetchingContainer ? (
                                            <div className="flex items-center justify-center p-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Loading container...</span>
                                            </div>
                                        ) : (
                                            /* Container Form Component - pass the current container ID */
                                            <ContainerFormComponent
                                                containerId={currentContainerId}
                                                onSaveSuccess={handleContainerSaved}
                                                title={isContainerInApplet ? "Edit Container" : "New Container"}
                                            />
                                        )}

                                        {/* Add to applet button - only shown if not already in the applet */}
                                        {currentContainerId && !isContainerInApplet && !fetchingContainer && (
                                            <div className="mt-4">
                                                <Button
                                                    onClick={handleAddContainerToApplet}
                                                    disabled={isAddingToApplet}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    {isAddingToApplet ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                        <PlusIcon className="mr-2 h-4 w-4" />
                                                        <Cpu className="mr-2 h-4 w-4" />
                                                        </>
                                                    )}
                                                    Compile and Add to {activeAppletName}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* List of containers */}
                                    <Card className="md:col-span-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                                        {applet.name} Containers
                                                    </CardTitle>
                                                    <CardDescription className="text-gray-500 dark:text-gray-400 pl-2">
                                                        {appletContainers.length === 0
                                                            ? "No Containers Added"
                                                            : appletContainers.length === 1
                                                            ? "1 Container"
                                                            : `${appletContainers.length} Containers`}
                                                    </CardDescription>
                                                </div>

                                                {applet.isDirty && (
                                                    <Button
                                                        onClick={() => saveAndRecompileApplet(applet.id)}
                                                        disabled={savingApplet}
                                                        size="sm"
                                                        className="bg-amber-500 hover:bg-amber-600 text-white"
                                                    >
                                                        {savingApplet ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                        )}
                                                        Recompile Containers
                                                    </Button>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {appletContainers.length === 0 ? (
                                                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        No containers added to this applet yet
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        Use the form to add your first container
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                                    {appletContainers.map((container: ContainerBuilder) => (
                                                        <div
                                                            key={container.id}
                                                            onClick={() => handleContainerSelect(container.id)}
                                                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                                activeContainerId === container.id
                                                                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                                        {container.label || "Unnamed Container"}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        {container.shortLabel || "No short label"}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-1 px-2 rounded-full">
                                                                        {container.fields?.length || 0} field
                                                                        {container.fields?.length !== 1 ? "s" : ""}
                                                                    </span>
                                                                    {!allContainerIds.includes(container.id) && (
                                                                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 py-1 px-2 rounded-full">
                                                                            Compiled Version
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    
                                    {/* App Info Card - right column */}
                                    <div className="md:col-span-3 bg-gray-100 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <AppInfoCard appId={appId} className="h-full" />
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </>
            )}
        </div>
    );
};

export default GroupsConfigStep;
