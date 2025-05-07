"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, Loader2, SaveIcon, RefreshCw, Cpu, Trash2 } from "lucide-react";
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
import { setIsDirty as setAppletIsDirty, removeContainer } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { setActiveContainer, startNewContainer } from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import {
    saveContainerAndUpdateAppletThunk,
    fetchContainerByIdThunk,
    setActiveContainerWithFetchThunk,
} from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { saveAppletThunk, recompileAppletThunk, setActiveAppletWithFetchThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import GroupSelectorOverlay from "../modules/smart-parts/containers/GroupSelectorOverlay";
import ContainerFormComponent from "../modules/smart-parts/containers/ContainerFormComponent";
import { ComponentGroup } from "../builder.types";
import { AppletBuilder, ContainerBuilder } from "@/lib/redux/app-builder/types";
import { v4 as uuidv4 } from "uuid";
import AppInfoCard from "@/features/applet/builder/previews/AppInfoCard";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";

interface GroupsConfigStepProps {
    appId: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({ appId, onUpdateCompletion }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();

    // Simple UI toggle state - keep as React state
    const [processingContainerId, setProcessingContainerId] = useState<string | null>(null);
    const [isAddingToApplet, setIsAddingToApplet] = useState<boolean>(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
    const [savingApplet, setSavingApplet] = useState<boolean>(false);
    const [fetchingContainer, setFetchingContainer] = useState<boolean>(false);

    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [containerToDelete, setContainerToDelete] = useState<string | null>(null);
    const [isDeletingContainer, setIsDeletingContainer] = useState<boolean>(false);

    // Get data directly from Redux using individual selectors
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const containerError = useAppSelector(selectContainerError);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const newContainerId = useAppSelector(selectNewContainerId);
    const allContainerIds = useAppSelector(selectAllContainerIds);

    const [compiledContainerCount, setCompiledContainerCount] = useState<number>(0);

    // Get applets directly from Redux
    const applets = useAppSelector((state) => (appId ? selectAppletsByAppId(state, appId) : [])) as AppletBuilder[];

    useEffect(() => {
        setCompiledContainerCount(0);
        applets.forEach((applet) => {
            setCompiledContainerCount((prevCount) => prevCount + (applet.containers?.length || 0));
        });
    }, [applets]);

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
            dispatch(setActiveAppletWithFetchThunk(applets[0].id))
                .unwrap()
                .catch((error) => {
                    console.error("Failed to set active applet:", error);
                    toast({
                        title: "Error",
                        description: "Failed to set active applet.",
                        variant: "destructive",
                    });
                });
            setInitialLoadComplete(true);
        }
    }, [applets, dispatch, initialLoadComplete, toast]);

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
            dispatch(setActiveAppletWithFetchThunk(appletId))
                .unwrap()
                .catch((error) => {
                    console.error("Failed to set active applet:", error);
                    toast({
                        title: "Error",
                        description: "Failed to set active applet.",
                        variant: "destructive",
                    });
                });
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

    // Update completion status for parent component
    useEffect(() => {
        const hasApplets = applets.length > 0;
        const hasContainers = compiledContainerCount > 0;
        const canProceed = hasApplets; // Can proceed as long as there are applets

        let message = "";
        if (!hasApplets) {
            message = "No applets found. Please go back and add an applet first.";
        } else if (!hasContainers) {
            message = "No containers found. You can create one or add existing ones.";
        } else if (isAppletDirty) {
            message = "Unsaved changes. Please save your applet.";
        } else {
            message = `You have ${compiledContainerCount} container${compiledContainerCount === 1 ? "" : "s"} configured.`;
        }

        // Create a save button if the applet has unsaved changes
        const footerButtons = isAppletDirty ? (
            <Button
                onClick={saveActiveApplet}
                className="border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                variant="outline"
                disabled={savingApplet}
            >
                {savingApplet ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SaveIcon className="h-4 w-4 mr-1" />}
                Save Applet
            </Button>
        ) : undefined;

        onUpdateCompletion?.({
            isComplete: hasContainers,
            canProceed,
            message,
            footerButtons,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applets.length, appletContainers.length, isAppletDirty, savingApplet]);

    // Handle container deletion
    const openDeleteDialog = (containerId: string, event: React.MouseEvent) => {
        // Stop the click event from bubbling up to the parent (container selection)
        event.stopPropagation();
        setContainerToDelete(containerId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteContainer = async () => {
        if (!containerToDelete || !activeAppletId) return;

        setIsDeletingContainer(true);

        try {
            // Dispatch the remove container action
            dispatch(removeContainer({ appletId: activeAppletId, containerId: containerToDelete }));

            // If this was the active container, clear it
            if (activeContainerId === containerToDelete) {
                dispatch(setActiveContainer(null));
            }

            // Notify the user
            toast({
                title: "Success",
                description: "Container removed from applet.",
            });

            // Return a resolved promise to indicate success
            return Promise.resolve();
        } catch (error) {
            console.error("Error removing container:", error);
            toast({
                title: "Error",
                description: "Failed to remove container.",
                variant: "destructive",
            });
            return Promise.reject(error);
        } finally {
            setIsDeletingContainer(false);
        }
    };

    const handleSaveAfterDelete = async () => {
        if (!activeAppletId) return Promise.resolve();

        try {
            return saveAndRecompileApplet(activeAppletId);
        } catch (error) {
            console.error("Error saving applet after delete:", error);
            return Promise.reject(error);
        }
    };

    return (
        <div className="w-full">
            {/* DeleteConfirmationDialog component */}
            <ConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                handleDeleteGroup={handleDeleteContainer}
                loading={isDeletingContainer}
                title="Remove Container"
                description="Are you sure you want to remove this container from the applet? This action cannot be undone."
                deleteButtonText="Remove Container"
                hasSecondStep={true}
                secondStepButtonText="Remove & Save Immediately"
                onSecondStepConfirm={handleSaveAfterDelete}
            />

            <Card className="bg-white dark:bg-slate-900 overflow-hidden p-0 rounded-3xl border-2 border-rose-200 dark:border-rose-600">
                <CardHeader className="bg-gray-100 dark:bg-gray-700 border-b-2 border-rose-200 dark:border-rose-600 p-3 rounded-t-3xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-rose-500 font-medium text-lg">Field Container Configuration</h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm pt-1">
                                Containers group similar fields together. Include One or More Fields.
                            </p>
                        </div>
                    </div>
                </CardHeader>

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
                        <Tabs value={activeAppletId || ""} onValueChange={handleAppletChange} className="w-full p-4">
                            <TabsList className="bg-transparent border-none">
                                {applets.map((applet) => (
                                    <TabsTrigger key={applet.id} value={applet.id}>
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

                                        {/* List of containers TODO: NEED to add delete logic here that deletes the container from the applet and triggers a save, but does not delete the container from the container database or Redux.*/}
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
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-1 px-2 rounded-full">
                                                                            {container.fields?.length || 0} field
                                                                            {container.fields?.length !== 1 ? "s" : ""}
                                                                        </span>
                                                                        {!allContainerIds.includes(container.id) && (
                                                                            <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 py-1 px-2 rounded-full">
                                                                                Compiled Version
                                                                            </span>
                                                                        )}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={(e) => openDeleteDialog(container.id, e)}
                                                                            className="h-7 w-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
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
            </Card>
        </div>
    );
};

export default GroupsConfigStep;
