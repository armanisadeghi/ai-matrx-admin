"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    selectAllContainers,
    selectActiveContainerId,
    selectContainerLoading,
    selectContainerError,
    selectContainerById,
} from "@/lib/redux/app-builder/selectors/containerSelectors";
import { setActiveApplet } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import {
    setActiveContainer,
    startNewContainer,
    setLabel as setContainerLabel,
    setShortLabel,
    setDescription as setContainerDescription,
} from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import { saveContainerAndUpdateAppletThunk, saveContainerThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { v4 as uuidv4 } from "uuid";
import GroupSelectorOverlay from "./smart-parts/containers/GroupSelectorOverlay";
import { ComponentGroup } from "../builder.types";

interface GroupsConfigStepProps {
    appId?: string;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({ appId }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Simple UI toggle state - keep as React state
    const [showExistingGroups, setShowExistingGroups] = useState(false);
    const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);

    // Get data directly from Redux using individual selectors
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const containerLoading = useAppSelector(selectContainerLoading);
    const containerError = useAppSelector(selectContainerError);

    // Get the active container directly using a selector
    const activeContainer = useAppSelector((state) => (activeContainerId ? selectContainerById(state, activeContainerId) : null));

    // Get values for form fields directly from Redux
    const containerLabel = activeContainer?.label || "";
    const containerShortLabel = activeContainer?.shortLabel || "";
    const containerDescription = activeContainer?.description || "";

    // Get applets directly from Redux
    const applets = useAppSelector((state) => (appId ? selectAppletsByAppId(state, appId) : []));

    // Get all available containers for selection
    const allContainers = useAppSelector(selectAllContainers);

    // Get containers for the active applet
    const appletContainers = useAppSelector((state) => (activeAppletId ? selectContainersForApplet(state, activeAppletId) : []));

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

    // Set the active applet if not set and there are applets
    useEffect(() => {
        if (!activeAppletId && applets.length > 0) {
            dispatch(setActiveApplet(applets[0].id));
        }
    }, [activeAppletId, applets, dispatch]);

    // Filter available containers that haven't been added to this applet
    const appletContainerIds = appletContainers.map((container) => container.id);
    const availableContainers = allContainers.filter((container) => !appletContainerIds.includes(container.id));

    // Individual handlers for each action
    const handleAppletChange = (value: string) => {
        dispatch(setActiveApplet(value));
        dispatch(setActiveContainer(null));
    };

    const handleGroupSelect = (groupId: string) => {
        dispatch(setActiveContainer(groupId));
    };

    const handleCreateNewGroup = useCallback(() => {
        const id = uuidv4();
        dispatch(
            startNewContainer({
                id,
                label: "",
                shortLabel: "",
                description: "",
                fields: [],
            })
        );
        dispatch(setActiveContainer(id));
    }, [dispatch]);

    // Initialize a new container if none is active
    useEffect(() => {
        if (activeAppletId && !activeContainerId && !containerLoading) {
            handleCreateNewGroup();
        }
    }, [activeAppletId, activeContainerId, containerLoading, handleCreateNewGroup]);

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeContainerId) {
            dispatch(
                setContainerLabel({
                    id: activeContainerId,
                    label: e.target.value,
                })
            );
        }
    };

    const handleShortLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeContainerId) {
            dispatch(
                setShortLabel({
                    id: activeContainerId,
                    shortLabel: e.target.value,
                })
            );
        }
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (activeContainerId) {
            dispatch(
                setContainerDescription({
                    id: activeContainerId,
                    description: e.target.value,
                })
            );
        }
    };

    const handleExistingGroupSelect = (group: ComponentGroup) => {
        if (activeAppletId) {
            setProcessingGroupId(group.id);
            dispatch(
                saveContainerAndUpdateAppletThunk({
                    containerId: group.id,
                    appletId: activeAppletId,
                })
            )
                .unwrap()
                .then(() => {
                    toast({
                        title: "Success",
                        description: "Group added to applet successfully.",
                    });
                    setShowExistingGroups(false);
                })
                .catch((error) => {
                    toast({
                        title: "Error",
                        description: typeof error === "string" ? error : "Failed to add group to applet.",
                        variant: "destructive",
                    });
                })
                .finally(() => {
                    setProcessingGroupId(null);
                });
        }
    };

    const handleAddGroup = () => {
        if (!activeContainerId || !activeAppletId) return;

        dispatch(
            saveContainerAndUpdateAppletThunk({
                containerId: activeContainerId,
                appletId: activeAppletId,
            })
        )
            .unwrap()
            .then(() => {
                toast({
                    title: "Success",
                    description: "Group created and added to applet successfully.",
                });
                handleCreateNewGroup();
            })
            .catch((error) => {
                toast({
                    title: "Error",
                    description: typeof error === "string" ? error : "Failed to save group.",
                    variant: "destructive",
                });
            });
    };

    // Compute validation state for the add button
    const canCreateContainer = Boolean(containerLabel && containerShortLabel);

    return (
        <div className="space-y-6">
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
                                    className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm"
                                >
                                    {applet.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {applets.map((applet) => (
                            <TabsContent key={applet.id} value={applet.id} className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Add new group form */}
                                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                                        Add Group
                                                    </CardTitle>
                                                    <CardDescription className="text-gray-500 dark:text-gray-400">
                                                        Create or select a group for {applet.name}
                                                    </CardDescription>
                                                </div>
                                                <GroupSelectorOverlay
                                                    buttonLabel="Select a Group"
                                                    buttonVariant="outline"
                                                    buttonSize="sm"
                                                    buttonClassName="border-blue-500 text-blue-500"
                                                    onGroupSelected={handleExistingGroupSelect}
                                                    onCreateGroup={handleCreateNewGroup}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="label" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                        Group Label
                                                    </Label>
                                                    <Input
                                                        id="label"
                                                        name="label"
                                                        placeholder="e.g. Location"
                                                        value={containerLabel}
                                                        onChange={handleLabelChange}
                                                        className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor="shortLabel"
                                                        className="text-sm font-medium text-gray-800 dark:text-gray-200"
                                                    >
                                                        Short Label / Placeholder
                                                    </Label>
                                                    <Input
                                                        id="shortLabel"
                                                        name="shortLabel"
                                                        placeholder="e.g. Where are you going?"
                                                        value={containerShortLabel}
                                                        onChange={handleShortLabelChange}
                                                        className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor="description"
                                                        className="text-sm font-medium text-gray-800 dark:text-gray-200"
                                                    >
                                                        Description (Optional)
                                                    </Label>
                                                    <Textarea
                                                        id="description"
                                                        name="description"
                                                        placeholder="Enter a description for this group"
                                                        value={containerDescription}
                                                        onChange={handleDescriptionChange}
                                                        rows={3}
                                                        className="resize-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                                                    />
                                                </div>

                                                <Button
                                                    onClick={handleAddGroup}
                                                    disabled={!canCreateContainer || containerLoading}
                                                    className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                                                >
                                                    {containerLoading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Adding...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlusIcon className="h-4 w-4 mr-2" />
                                                            Add Group
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* List of groups */}
                                    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                            <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                                Configured Groups
                                            </CardTitle>
                                            <CardDescription className="text-gray-500 dark:text-gray-400">
                                                Groups for the {applet.name} applet
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {appletContainers.length === 0 ? (
                                                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                                    <p className="text-gray-500 dark:text-gray-400">No groups added to this applet yet</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        Use the form to add your first group
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                                    {appletContainers.map((container) => (
                                                        <div
                                                            key={container.id}
                                                            onClick={() => handleGroupSelect(container.id)}
                                                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                                activeContainerId === container.id
                                                                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                                        {container.label}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        {container.shortLabel}
                                                                    </p>
                                                                </div>
                                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                                    {container.fields?.length || 0} fields
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
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
