"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, Loader2, Cpu, SaveIcon, Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppletById, selectContainersForApplet } from "@/lib/redux/app-builder/selectors/appletSelectors";
import {
    selectActiveContainerId,
    selectContainerError,
    selectNewContainerId,
    selectAllContainerIds,
} from "@/lib/redux/app-builder/selectors/containerSelectors";
import { startNewContainer, setActiveContainer } from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import {
    saveContainerAndUpdateAppletThunk,
    setActiveContainerWithFetchThunk,
    fetchContainerByIdThunk,
} from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { saveAppletThunk, recompileAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import GroupSelectorOverlay from "../smart-parts/containers/GroupSelectorOverlay";
import ContainerFormComponent from "../smart-parts/containers/ContainerFormComponent";
import { ComponentGroup } from "../../builder.types";
import { v4 as uuidv4 } from "uuid";
import ContainersList from "./ContainersList";
import DraggableFields from "../field-builder/DraggableFields";
import ContainerListTable from "./ContainerListTable";

interface ContainerTabContentProps {
    appletId: string;
    appId: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

const ContainerTabContent: React.FC<ContainerTabContentProps> = ({ appletId, appId, onUpdateCompletion }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();

    // Simple UI toggle state - keep as React state
    const [processingContainerId, setProcessingContainerId] = useState<string | null>(null);
    const [isAddingToApplet, setIsAddingToApplet] = useState<boolean>(false);
    const [fetchingContainer, setFetchingContainer] = useState<boolean>(false);
    const [savingApplet, setSavingApplet] = useState<boolean>(false);
    const [compiledContainerCount, setCompiledContainerCount] = useState<number>(0);

    // Get data directly from Redux using individual selectors
    const containerError = useAppSelector(selectContainerError);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const newContainerId = useAppSelector(selectNewContainerId);
    const allContainerIds = useAppSelector(selectAllContainerIds);

    // Get containers for the active applet
    const appletContainers = useAppSelector((state) => selectContainersForApplet(state, appletId));

    // Get the active applet to check if it's dirty
    const activeApplet = useAppSelector((state) => selectAppletById(state, appletId));
    const isAppletDirty = activeApplet?.isDirty || false;
    const activeAppletName = activeApplet?.name || "";

    useEffect(() => {
        setCompiledContainerCount(appletContainers?.length || 0);
    }, [appletContainers]);

    // Filter containers that are already in the applet
    const appletContainerIds = appletContainers.map((container) => container.id);

    // Check if the current container is already in the applet
    const isContainerInApplet = activeContainerId ? appletContainerIds.includes(activeContainerId) : false;

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

    // Always ensure we have a container to work with when an applet is active
    useEffect(() => {
        if (appletId && !activeContainerId && !newContainerId) {
            const newId = uuidv4();
            dispatch(startNewContainer({ id: newId }));
        }
    }, [appletId, activeContainerId, newContainerId, dispatch]);

    // Create a new container
    const handleCreateNewContainer = useCallback(() => {
        const newId = uuidv4();
        dispatch(startNewContainer({ id: newId }));
    }, [dispatch]);

    // Handle container save completion
    const handleContainerSaved = (containerId: string) => {
        console.log("Container Tab Content Not going to do anything after this save... containerId", containerId);
    };

    // Select a container to edit
    const handleExistingContainerSelect = async (group: ComponentGroup) => {
        if (appletId) {
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
                dispatch(setActiveContainer(group.id));

                // Add the container to the applet using the thunk that handles database updates
                await dispatch(
                    saveContainerAndUpdateAppletThunk({
                        containerId: group.id,
                        appletId: appletId,
                    })
                ).unwrap();

                // After successfully adding the container to the applet in the database,
                // save and recompile the applet to ensure everything is in sync
                await saveAndRecompileApplet(appletId);

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
        if (appletId && isAppletDirty) {
            saveAndRecompileApplet(appletId);
        }
    };

    // Add a container to applet (if not already added)
    const handleAddContainerToApplet = async () => {
        if (!activeContainerId || !appletId) return;

        setIsAddingToApplet(true);
        setProcessingContainerId(activeContainerId);

        try {
            // Add the container to the applet and update the database
            await dispatch(
                saveContainerAndUpdateAppletThunk({
                    containerId: activeContainerId,
                    appletId: appletId,
                })
            ).unwrap();

            // After successfully adding the container, save and recompile the applet
            await saveAndRecompileApplet(appletId);

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
        const hasContainers = compiledContainerCount > 0;

        let message = "";
        if (!hasContainers) {
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
            canProceed: true, // Can proceed as long as there's an applet
            message,
            footerButtons,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compiledContainerCount, isAppletDirty, savingApplet]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Container List Table - first column */}
            <div className="md:col-span-3 bg-gray-100 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden rounded-t-xl">
                <ContainerListTable
                    onContainerEdit={(id) => {
                        // Set this container as active
                        dispatch(setActiveContainer(id));
                    }}
                    onContainerSelect={(id) => {
                        // Set this container as active
                        dispatch(setActiveContainer(id));
                    }}
                    onContainerCreate={handleCreateNewContainer}
                    internalFetch={true}
                    hiddenColumns={["icon", "description", "shortLabel", "createdAt", "updatedAt"]}
                    defaultPageSize={10}
                    title=""
                    hideStatusColumn={true}
                    hideIconColumn={true}
                    customSettings={{
                        tableClassName: "text-xs",
                        hideEntriesInfo: true,
                    }}
                    allowSelectAction={true}
                />
            </div>

            {/* Container form card */}
            <div className="md:col-span-3">
                {/* <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{activeAppletName}</h3>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-500 text-emerald-500"
                            onClick={handleCreateNewContainer}
                        >
                            Create
                        </Button>

                        <GroupSelectorOverlay
                            buttonLabel="Existing"
                            buttonVariant="outline"
                            buttonSize="sm"
                            buttonClassName="border-blue-500 text-blue-500"
                            onGroupSelected={handleExistingContainerSelect}
                            onCreateGroup={handleCreateNewContainer}
                        />
                    </div>
                </div> */}

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
                        initialAppletId={appletId}
                    />
                )}

                {/* Add to applet button - only shown if not already in the applet */}
                {/* {currentContainerId && !isContainerInApplet && !fetchingContainer && (
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
                )} */}
            </div>

            {/* List of containers */}
            <div className="md:col-span-3">
                <ContainersList appletId={appletId} appletName={activeAppletName} isDirty={isAppletDirty} />
            </div>

            {/* Fields Preview - right column */}
            <div className="md:col-span-3">
                <DraggableFields appId={appId} appletId={appletId} className="h-full" />
            </div>
        </div>
    );
};

export default ContainerTabContent;
