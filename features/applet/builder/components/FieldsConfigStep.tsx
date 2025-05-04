"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppletsByAppId, selectActiveAppletId, selectAppletById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectActiveContainerId, selectContainerById, selectContainerLoading } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { selectActiveFieldId, selectNewFieldId } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { setActiveField, startFieldCreation } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { setActiveFieldWithFetchThunk, saveFieldAndUpdateContainerThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import AppletSidebarNavigation from "./smart-parts/applets/AppletSidebarNavigation";
import FieldsList from "./smart-parts/fields/FieldsList";
import { FieldSelectorOverlay } from "./smart-parts";
import { useToast } from "@/components/ui/use-toast";
import { FieldDefinition } from "@/features/applet/builder/builder.types";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import FieldEditor from "../modules/field-builder/FieldEditor";
import SectionCard from "../modules/field-builder/components/SectionCard";
import EmptyStateCard from "../modules/field-builder/components/EmptyStateCard";
import { AppWindow, Component, PanelRight } from "lucide-react";

interface FieldsConfigStepProps {
    appId: string;
}

export const FieldsConfigStep: React.FC<FieldsConfigStepProps> = ({ appId }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Redux state
    const applets = useAppSelector((state) => selectAppletsByAppId(state, appId)) as AppletBuilder[];
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const activeFieldId = useAppSelector(selectActiveFieldId);
    const newFieldId = useAppSelector(selectNewFieldId);
    const containerLoading = useAppSelector(selectContainerLoading);

    // Get active applet info
    const activeApplet = useAppSelector((state) => (activeAppletId ? selectAppletById(state, activeAppletId) : null));
    const activeAppletName = activeApplet?.name || "";

    // Get active container info
    const activeContainer = useAppSelector((state) => (activeContainerId ? selectContainerById(state, activeContainerId) : null));
    const activeGroupLabel = activeContainer?.label || "";

    // Helper to get fields from active container
    const getFieldsFromContainer = () => {
        if (!activeContainer) return [];
        return activeContainer.fields || [];
    };

    // Handler for container selection (clears active field)
    const handleContainerSelected = () => {
        dispatch(setActiveField(null));
    };

    // Handler for field operations (refetch container to update UI)
    const handleFieldOperationCompleted = () => {
        // No need to do anything here as the Redux state will be updated automatically
        // and the container data will be refreshed
    };

    const handleCreateNewField = () => {
        if (!activeContainerId) {
            toast({
                title: "No container selected",
                description: "Please select a container before creating a field",
                variant: "destructive",
            });
            return;
        }

        // Initialize a new field in the Redux store
        dispatch(
            startFieldCreation({
                // Default values for new field
                label: "New Field",
                component: "input",
                componentProps: {},
            })
        );
    };

    const handleExistingFieldSelect = (field: FieldDefinition) => {
        if (!field.id) {
            console.error("Field ID is missing");
            return;
        }

        // Use the thunk to set the active field with fetching if needed
        dispatch(setActiveFieldWithFetchThunk(field.id));

        toast({
            title: "Field Selected",
            description: `You selected the field "${field.label}"`,
        });
    };

    // Handler for when a field is successfully saved
    const handleFieldSaved = async (fieldId: string) => {
        if (activeContainerId) {
            try {
                // Save the field and update the container
                await dispatch(
                    saveFieldAndUpdateContainerThunk({
                        fieldId,
                        containerId: activeContainerId,
                    })
                ).unwrap();

                toast({
                    title: "Success",
                    description: "Field saved and container updated successfully",
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to update container with the saved field",
                    variant: "destructive",
                });
            }
        }
    };

    // Handler for when field editing is cancelled
    const handleFieldEditCancel = () => {
        dispatch(setActiveField(null));
    };

    // Determine if we're editing an existing field or creating a new one
    const currentFieldId = activeFieldId || newFieldId;
    const isCreatingNew = Boolean(newFieldId && currentFieldId === newFieldId);

    if (applets.length === 0) {
        return (
            <SectionCard title="Application Builder" description="Create your first applet to get started">
                <EmptyStateCard
                    title="No Applets Available"
                    description="You need to create applets and groups before you can configure fields. Start by creating your first applet."
                    icon={AppWindow}
                    buttonText="Go Back"
                    onButtonClick={() => window.history.back()}
                />
            </SectionCard>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-12 gap-6">
                {/* Left Column - Sidebar and Fields List */}
                <div className="col-span-12 md:col-span-3 space-y-6">
                    {/* Sidebar Navigation with fixed height container */}
                    <div className="min-h-[400px] flex flex-col">
                        <AppletSidebarNavigation appId={appId} title="Navigation" onSelectContainer={handleContainerSelected} />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-500" onClick={handleCreateNewField}>
                            Create New Field
                        </Button>

                        <FieldSelectorOverlay
                            buttonLabel="Select Existing Field"
                            buttonVariant="outline"
                            buttonSize="sm"
                            buttonClassName="border-blue-500 text-blue-500"
                            onFieldSelected={handleExistingFieldSelect}
                            onCreateField={handleCreateNewField}
                        />
                    </div>

                    {/* Fields List - now underneath the sidebar */}
                    <div className="min-h-[400px] flex flex-col">
                        <FieldsList fields={getFieldsFromContainer()} onFieldRemoved={handleFieldOperationCompleted} />
                    </div>
                </div>

                {/* Right Column - Main Content Area */}
                <div className="col-span-12 md:col-span-9 space-y-6">
                    {activeAppletId && activeContainerId ? (
                        <>
                            {/* Field Editor Component */}
                            <div className="min-h-[600px]">
                                {currentFieldId ? (
                                    <FieldEditor
                                        fieldId={currentFieldId}
                                        isCreatingNew={isCreatingNew}
                                        onSaveSuccess={handleFieldSaved}
                                        onCancel={handleFieldEditCancel}
                                    />
                                ) : (
                                    <SectionCard title="Field Configuration" description="Select or create a field to configure it">
                                        <EmptyStateCard
                                            title="No Field Selected"
                                            description="Choose an existing field from the list on the left to edit its settings, or create a new field component."
                                            icon={Component}
                                            buttonText="Create New Field"
                                            onButtonClick={handleCreateNewField}
                                            secondaryButton={
                                                <FieldSelectorOverlay
                                                    buttonLabel="Select Existing Field"
                                                    buttonVariant="outline"
                                                    buttonClassName="border-blue-500 text-blue-500"
                                                    onFieldSelected={handleExistingFieldSelect}
                                                    onCreateField={handleCreateNewField}
                                                />
                                            }
                                        />
                                    </SectionCard>
                                )}
                            </div>
                        </>
                    ) : (
                        <SectionCard title="Group Selection Required" description="Choose a container from the sidebar to begin">
                            <EmptyStateCard
                                title="Select a Group to Continue"
                                description="Please select an applet and group from the sidebar to start configuring fields for your component."
                                icon={PanelRight}
                                
                            />
                        </SectionCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FieldsConfigStep;
