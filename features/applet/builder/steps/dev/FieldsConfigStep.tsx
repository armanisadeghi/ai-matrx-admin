"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppletsByAppId, selectActiveAppletId, selectAppletById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectActiveContainerId, selectContainerById, selectContainerLoading } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { selectActiveFieldId, selectNewFieldId } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { setActiveField, startFieldCreation } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { setActiveFieldWithFetchThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import AppletSidebarNavigation from "../../modules/smart-parts/applets/AppletSidebarNavigation";
import FieldsList from "../../modules/smart-parts/fields/FieldsList";
import { FieldSelectorOverlay } from "../../modules/smart-parts";
import { useToast } from "@/components/ui/use-toast";
import { FieldDefinition } from "@/features/applet/builder/builder.types";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import FieldEditor from "../../modules/field-builder/FieldEditor";
import SectionCard from "@/components/official/cards/SectionCard";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { AppWindow, Component, PanelRight, SaveIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { updateFieldThunk, addFieldAndCompileContainerThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { recompileAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";


interface FieldsConfigStepProps {
    appId: string;
    onUpdateCompletion?: (completion: { isComplete: boolean; canProceed: boolean; message?: string; footerButtons?: React.ReactNode }) => void;
}

export const FieldsConfigStep: React.FC<FieldsConfigStepProps> = ({ appId, onUpdateCompletion }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Redux state
    const applets = useAppSelector((state) => selectAppletsByAppId(state, appId)) as AppletBuilder[];
    const activeAppletId = useAppSelector(selectActiveAppletId);
    const activeContainerId = useAppSelector(selectActiveContainerId);
    const activeFieldId = useAppSelector(selectActiveFieldId);
    const activeApplet = useAppSelector((state) => (activeAppletId ? selectAppletById(state, activeAppletId) : null));
    const activeContainer = useAppSelector((state) => (activeContainerId ? selectContainerById(state, activeContainerId) : null));
    const activeContainerLabel = activeContainer?.label || "";
    const activeContainerFieldCount = activeContainer?.fields?.length || 0;

    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Helper to get fields from active container
    const getFieldsFromContainer = () => {
        if (!activeContainer) return [];
        return activeContainer.fields || [];
    };

    // Handler for container selection (clears active field)
    const handleContainerSelected = () => {
        dispatch(setActiveField(null));
    };


    const handleFieldClicked = (fieldId: string) => {
        setIsCreatingNew(false);
        dispatch(setActiveFieldWithFetchThunk(fieldId));
    };

    // Handler for field operations (called after field removal)
    // This should NOT recompile anything, just trigger UI refresh as needed
    const handleFieldOperationCompleted = () => {
        // Simply refresh the UI with whatever is already in state
        // No database operations needed here as the specific field operations
        // already handled their own database updates
        
        // We could consider refreshing the container from the database,
        // but that should be an explicit user action, not automatic
    };

    const handleCreateNewField = () => {
        console.log("FieldsConfigStep handleCreateNewField");
        if (!activeContainerId) {
            toast({
                title: "No container selected",
                description: "Please select a container before creating a field",
                variant: "destructive",
            });
            return;
        }

        const newFieldId = uuidv4();
        setIsCreatingNew(true);
        console.log("FieldsConfigStep newFieldId", newFieldId);
        dispatch(
            startFieldCreation({
                id: newFieldId,
            })
        );
    };

    const handleExistingFieldSelect = async (field: FieldDefinition) => {
        if (!field.id) {
            console.error("Field ID is missing");
            return;
        }
        setIsCreatingNew(false);

        if (!activeContainerId || !activeAppletId) {
            toast({
                title: "Container or Applet not selected",
                description: "Please select a container and applet before selecting a field",
                variant: "destructive",
            });
            return;
        }

        try {
            // Use the thunk to set the active field with fetching if needed
            await dispatch(setActiveFieldWithFetchThunk(field.id));

            // Add the field to the container using the proper container thunk
            await dispatch(
                addFieldAndCompileContainerThunk({
                    containerId: activeContainerId,
                    field: field
                })
            ).unwrap();
            
            // Recompile the applet to ensure container changes are propagated
            await dispatch(recompileAppletThunk(activeAppletId)).unwrap();

            toast({
                title: "Field Selected",
                description: `Field "${field.label}" added to the container and applet recompiled`,
            });
        } catch (error) {
            console.error('Error adding field to container:', error);
            toast({
                title: "Error",
                description: typeof error === "string" ? error : "Failed to add field to container",
                variant: "destructive",
            });
        }
    };

    // Handler for when a field is successfully saved
    const handleFieldSaved = async (fieldId: string) => {
        setIsCreatingNew(false);

        console.log("FieldsConfigStep handleFieldSaved - Not doing anything with:", fieldId);
        // if (activeContainerId && activeAppletId) {
        //     try {
        //         // First, make sure the field is saved (this is handled by FieldEditor directly)
        //         // We don't need to call saveFieldThunk here since FieldEditor already does that
                
        //         // Now, we need to refresh the field in the container (proper separation of concerns)
        //         await dispatch(
        //             updateFieldThunk({
        //                 containerId: activeContainerId,
        //                 fieldId: fieldId,
        //                 changes: {} // No direct changes needed, we're just triggering a refresh
        //             })
        //         ).unwrap();
                
        //         // Recompile the applet to ensure container changes are propagated
        //         await dispatch(recompileAppletThunk(activeAppletId)).unwrap();

        //         toast({
        //             title: "Success",
        //             description: "Field saved, container updated, and applet recompiled successfully",
        //         });
        //     } catch (error) {
        //         console.error('Error updating container with saved field:', error);
        //         toast({
        //             title: "Error",
        //             description: "Failed to update container with the saved field",
        //             variant: "destructive",
        //         });
        //     }
        // }
    };

    // Handler for when field editing is cancelled
    const handleFieldEditCancel = () => {
        setIsCreatingNew(false);
        dispatch(setActiveField(null));
    };


    // Update completion status
    useEffect(() => {
        const hasApplets = applets.length > 0;
        const hasContainer = !!activeContainer;
        const hasFields = hasContainer && activeContainerFieldCount > 0;
        
        let message = '';
        if (!hasApplets) {
            message = "No applets found. Please go back and add an applet first.";
        } else if (!hasContainer) {
            message = "No container selected. Please select a container to add fields.";
        } else if (!hasFields) {
            message = "No fields added yet. You can add fields to your container.";
        } else {
            message = `Container "${activeContainerLabel}" has ${activeContainerFieldCount} field${activeContainerFieldCount === 1 ? '' : 's'}.`;
        }

        // For simplicity, we don't add any footer buttons since field editing is handled in the UI
        // and there's no global "save all" for fields that would make sense here

        onUpdateCompletion?.({
            isComplete: hasApplets && hasContainer && hasFields,
            canProceed: true, // Allow proceeding even without fields, as they might not be needed
            message
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applets.length, activeContainer, activeContainerFieldCount, activeContainerLabel]);

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
            <div className="grid grid-cols-12 gap-4">
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
                        <FieldsList 
                            fields={getFieldsFromContainer()} 
                            onFieldRemoved={handleFieldOperationCompleted}
                            containerId={activeContainerId || undefined}
                            onFieldClicked={handleFieldClicked}
                        />
                    </div>
                </div>

                {/* Right Column - Main Content Area */}
                <div className="col-span-12 md:col-span-9 space-y-6">
                    {activeAppletId && activeContainerId ? (
                        <>
                            {/* Field Editor Component */}
                            <div className="min-h-[600px]">
                                {activeFieldId ? (
                                    <FieldEditor
                                        fieldId={activeFieldId}
                                        isCreatingNew={isCreatingNew}
                                        onSaveSuccess={handleFieldSaved}
                                        onCancel={handleFieldEditCancel}
                                        containerId={activeContainerId}

                                    />
                                ) : (
                                    <SectionCard title={`Container: ${activeContainerLabel}`} description="Select or create a field to configure it">
                                        <EmptyStateCard
                                            title={`No Field Selected. Total Fields: ${activeContainerFieldCount}`}
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
