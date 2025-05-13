"use client";

import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectContainersForApplet, selectIsAppletDirtyById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectActiveContainerId, selectAllContainerIds, selectIsContainerDirtyById } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { removeContainer } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { setActiveContainer } from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import {
    setActiveContainerWithFetchThunk,
    fetchContainerByIdThunk,
    fetchContainersThunk,
} from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { saveAppletThunk, recompileAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";
import { ContainerBuilder } from "@/lib/redux/app-builder/types";
import ContainerCard from "./ContainerCard";

interface ContainersListProps {
    appletId: string;
    appletName: string;
}

const ContainersList: React.FC<ContainersListProps> = ({ appletId, appletName }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();

    // UI state
    const [fetchingContainer, setFetchingContainer] = useState<boolean>(false);
    const [savingApplet, setSavingApplet] = useState<boolean>(false);

    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [containerToDelete, setContainerToDelete] = useState<string | null>(null);
    const [isDeletingContainer, setIsDeletingContainer] = useState<boolean>(false);

    // Selectors
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const allContainerIds = useAppSelector(selectAllContainerIds);
    const appletContainers = useAppSelector((state) => (appletId ? selectContainersForApplet(state, appletId) : []));

    const isAppletDirty = useAppSelector((state) => selectIsAppletDirtyById(state, appletId));
    const isContainerDirty = useAppSelector((state) => selectIsContainerDirtyById(state, activeContainerId));

    useEffect(() => {
        dispatch(fetchContainersThunk());
    }, []);

    // Handle container selection
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

    // const handleSaveContainer = async () => {
    //     if (!activeContainerId) return;

    //     setIsSaving(true);

    //     try {
    //         const result = await dispatch(saveContainerThunk(activeContainerId)).unwrap();

    //         toast({
    //             title: "Success",
    //             description: "Container saved successfully.",
    //         });

    //         if (onSaveSuccess) {
    //             onSaveSuccess(result.id);
    //         }
    //     } catch (error) {
    //         toast({
    //             title: "Error",
    //             description: typeof error === "string" ? error : "Failed to save container.",
    //             variant: "destructive",
    //         });
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    // Save and recompile applet
    const saveAndRecompileApplet = async () => {
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

    // Handle container deletion
    const openDeleteDialog = (containerId: string, event: React.MouseEvent) => {
        // Stop the click event from bubbling up to the parent (container selection)
        event.stopPropagation();
        setContainerToDelete(containerId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteContainer = async () => {
        if (!containerToDelete || !appletId) return;

        setIsDeletingContainer(true);

        try {
            // Dispatch the remove container action
            dispatch(removeContainer({ appletId, containerId: containerToDelete }));

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
        if (!appletId) return Promise.resolve();

        try {
            return saveAndRecompileApplet();
        } catch (error) {
            console.error("Error saving applet after delete:", error);
            return Promise.reject(error);
        }
    };

    return (
        <>
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

            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">{appletName} Containers</CardTitle>
                            <CardDescription className="text-gray-500 dark:text-gray-400 pl-2">
                                {appletContainers.length === 0
                                    ? "No Containers Added"
                                    : appletContainers.length === 1
                                    ? "1 Container"
                                    : `${appletContainers.length} Containers`}
                            </CardDescription>
                        </div>
                        {isAppletDirty && !isContainerDirty && (
                            <Button
                                onClick={saveAndRecompileApplet}
                                disabled={savingApplet}
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {savingApplet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Recompile Applet
                            </Button>
                        )}

                        {isContainerDirty && (
                            <Button
                                // onClick={saveAndRecompileContainer}
                                // disabled={savingContainer}
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {savingApplet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Recompile Container
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {appletContainers.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">No containers added to this applet yet</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use the form to add your first container</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {appletContainers.map((container: ContainerBuilder) => (
                                <ContainerCard
                                    key={container.id}
                                    appletId={appletId}
                                    containerId={container.id}
                                    isActive={activeContainerId === container.id}
                                    onSelect={handleContainerSelect}
                                    onDelete={openDeleteDialog}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default ContainersList;
